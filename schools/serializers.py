import re

from rest_framework import serializers
from .models import ADMISSION_STATUS, Enquiry, LocationPage, Review, School


def file_or_url(request, file_field, url):
    """Uploaded file ho to uska poora URL, warna link (URL) wali value."""
    if file_field:
        try:
            link = file_field.url
        except ValueError:
            link = ''
        if link:
            return request.build_absolute_uri(link) if request else link
    if url and str(url).startswith('/media/') and request:
        return request.build_absolute_uri(url)
    return url or ''

ADMISSION_LABEL = dict(ADMISSION_STATUS)


def _approved(obj, limit):
    """Approved reviews. Uses the prefetched list if the view provided it (no extra query)."""
    rows = getattr(obj, 'approved_reviews', None)
    if rows is None:
        rows = list(obj.review_items.filter(is_approved=True)[:limit])
    return [
        {'name': r.name, 'role': r.role, 'rating': r.rating, 'text': r.text, 'date': r.created_at.date().isoformat()}
        for r in rows[:limit]
    ]


def _admission(obj):
    return {
        'admissionStatus': obj.admission_status,
        'admissionLabel': ADMISSION_LABEL.get(obj.admission_status, 'Admissions Open'),
        'admissionSession': obj.current_admission_session or '',
        'admissionLastDate': obj.admission_last_date.isoformat() if obj.admission_last_date else '',
    }

class SchoolSerializer(serializers.ModelSerializer):
    schoolId = serializers.IntegerField(source='school_id', read_only=True)

    class Meta:
        model = School
        exclude = ('cover_image',)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        req = self.context.get('request')

        # ---- fee slabs (from FeeComponent rows)
        comps = list(obj.fee_components.all())
        if comps:
            groups = {}
            for c in comps:
                groups.setdefault((c.session, c.class_name or 'All classes'), []).append(
                    {'label': c.name, 'freq': c.frequency, 'amount': c.amount})
            data['feeSlabs'] = [{'session': s, 'cls': cl, 'rows': rows} for (s, cl), rows in groups.items()]

        # ---- cover image & logo: file upload wins, else link
        logo_val = obj.logo_url or ''
        if not logo_val and isinstance(obj.profile, dict):
            logo_val = obj.profile.get('logo_url') or obj.profile.get('logo') or ''
        if not logo_val and hasattr(obj, 'school_accounts'):
            sa_with_logo = obj.school_accounts.exclude(logo_file='').first()
            if sa_with_logo:
                logo_val = file_or_url(req, sa_with_logo.logo_file, '')
            else:
                sa = obj.school_accounts.first()
                if sa and isinstance(sa.pending_edit_data, dict):
                    logo_val = sa.pending_edit_data.get('logoUrl') or ''
        if logo_val and str(logo_val).startswith('/media/') and req:
            logo_val = req.build_absolute_uri(logo_val)
        data['logo'] = logo_val
        data['logoUrl'] = logo_val
        data['logo_url'] = logo_val
        data['image'] = file_or_url(req, obj.cover_image, obj.image)

        # ---- highlights / FAQs / gallery: new inline rows win, old JSON is the fallback
        hl = [h.text for h in obj.highlight_items.all()]
        if hl:
            data['highlights'] = hl
        faqs = [{'q': f.question, 'a': f.answer} for f in obj.faq_items.all()]
        if faqs:
            data['faqs'] = faqs
        photos = [file_or_url(req, p.image, p.image_url) for p in obj.photo_items.all()]
        photos = [p for p in photos if p]
        if photos:
            data['gallery'] = photos
            data['photos'] = len(photos)

        # the website shows the first number to call; keep the old "A / B" format it already understands
        data['phone'] = ' / '.join(x for x in (obj.phone, obj.landline) if x)

        # ---- owner
        o = obj.owner
        def _mask_em(em):
            em = (em or '').strip()
            if '@' in em:
                u, d = em.split('@', 1)
                return f'{u[:2]}****@{d}'
            return 'hidden@email.com' if em else ''
        def _mask_ph(ph):
            ph = (ph or '').strip()
            return f'+91 {ph[:2]}XXXXXX{ph[-2:]}' if len(ph) >= 10 else ('+91 XXXXXXXXXX' if ph else '')
        data['owner'] = None if not o else {
            'name': o.name, 'designation': o.designation or 'Verified School Leadership', 'bio': o.bio,
            'email': _mask_em(o.email), 'phone': _mask_ph(o.phone),
            'photo': file_or_url(req, o.photo, o.photo_url),
            'isVerified': True,
        }

        # ---- social links
        social = {
            'youtube': obj.youtube_url, 'facebook': obj.facebook_url, 'instagram': obj.instagram_url,
            'x': obj.x_url, 'linkedin': obj.linkedin_url, 'other': obj.other_url,
        }
        data['social'] = {k: v for k, v in social.items() if v}

        # ---- the website reads these from `profile` (same keys as before)
        prof = dict(obj.profile or {})
        if obj.established: prof['established'] = obj.established
        if obj.students: prof['students'] = obj.students
        if obj.students and obj.teachers: prof['ratio'] = max(1, round(obj.students / obj.teachers))
        elif obj.student_teacher_ratio and re.match(r'\s*\d+', obj.student_teacher_ratio):
            prof['ratio'] = int(re.match(r'\s*(\d+)', obj.student_teacher_ratio).group(1))
        if obj.teachers: prof['teachers'] = obj.teachers
        if obj.campus: prof['campus'] = obj.campus
        if obj.address: prof['address'] = obj.address
        if obj.email: prof['email'] = obj.email
        if obj.website: prof['website'] = obj.website
        prof['admissionStatus'] = ADMISSION_LABEL.get(obj.admission_status, 'Admissions Open')
        data.update(_admission(obj))
        data['profile'] = prof

        # ---- verified badge
        is_ver = (
            getattr(obj, 'verified', False)
            or (obj.owner is not None and getattr(obj.owner, 'approval_status', '') == 'approved')
            or (hasattr(obj, 'school_accounts') and obj.school_accounts.filter(status='approved', school_link_status='approved').exists())
        )
        data['verified'] = bool(is_ver)

        # ---- approved parent reviews (latest 10)
        data['reviewList'] = [
            {'name': r.name, 'role': r.role, 'rating': r.rating, 'text': r.text, 'date': r.created_at.date().isoformat()}
            for r in obj.review_items.filter(is_approved=True)[:10]
        ]
        return data


class SchoolListSerializer(serializers.ModelSerializer):
    """Light version for listing pages: no about / FAQs / gallery / fee slabs / owner."""
    schoolId = serializers.IntegerField(source='school_id', read_only=True)

    class Meta:
        model = School
        fields = ('schoolId', 'slug', 'name', 'area', 'city', 'state', 'board', 'grades', 'type', 'gender',
                  'rating', 'reviews', 'fee', 'feeMin', 'feeMax', 'facilities', 'photos',
                  'topRated', 'isFeatured', 'isRecommended', 'phone', 'landline', 'verified')

    def to_representation(self, obj):
        data = super().to_representation(obj)
        req = self.context.get('request')
        data['image'] = file_or_url(req, obj.cover_image, obj.image)
        data['phone'] = ' / '.join(x for x in (obj.phone, obj.landline) if x)
        data.pop('landline', None)
        logo_val = obj.logo_url or ''
        if not logo_val and isinstance(obj.profile, dict):
            logo_val = obj.profile.get('logo_url') or obj.profile.get('logo') or ''
        if logo_val and str(logo_val).startswith('/media/') and req:
            logo_val = req.build_absolute_uri(logo_val)
        data['logo'] = logo_val
        data['logoUrl'] = logo_val
        data['logo_url'] = logo_val
        data['photos'] = getattr(obj, 'photo_count', 0) or obj.photos
        is_ver = (
            getattr(obj, 'verified', False)
            or (obj.owner is not None and getattr(obj.owner, 'approval_status', '') == 'approved')
            or (hasattr(obj, 'school_accounts') and obj.school_accounts.filter(status='approved', school_link_status='approved').exists())
        )
        data['verified'] = bool(is_ver)
        data['reviewList'] = _approved(obj, 3)
        data.update(_admission(obj))
        return data


class ReviewSerializer(serializers.ModelSerializer):
    schoolId = serializers.IntegerField(write_only=True)

    class Meta:
        model = Review
        fields = ('schoolId', 'name', 'role', 'mobile', 'email', 'rating', 'text')

    def validate_mobile(self, v):
        if v and not (len(v) == 10 and v.isdigit() and v[0] in '6789'):
            raise serializers.ValidationError('Enter a valid 10-digit mobile number.')
        return v

    def validate_text(self, v):
        if not v or not v.strip():
            raise serializers.ValidationError('Please write a review.')
        return v.strip()

    def create(self, validated):
        sid = validated.pop('schoolId')
        school = School.objects.filter(school_id=sid, isActive=True).first()
        if not school:
            school = School.objects.filter(pk=sid, isActive=True).first()
        if not school:
            raise serializers.ValidationError({'schoolId': 'School not found.'})

        request = self.context.get('request')
        user = getattr(request, 'user', None) if request and request.user.is_authenticated else None
        extra = {}
        if user:
            extra['parent_user'] = user

        return Review.objects.create(school=school, is_approved=True, **extra, **validated)


class EnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Enquiry
        fields = '__all__'
        read_only_fields = ('status', 'adminNote', 'created_at', 'updated_at')

    def validate_mobile(self, value):
        if not (len(value) == 10 and value.isdigit() and value[0] in '6789'):
            raise serializers.ValidationError('Enter a valid 10-digit Indian mobile number.')
        return value


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationPage
        exclude = ('image',)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data['cover'] = file_or_url(self.context.get('request'), obj.image, obj.image_url)
        data['highlights'] = [h.text for h in obj.highlight_items.all()]
        rows = [{'q': f.question, 'a': f.answer} for f in obj.faq_items.all()]
        if rows:
            data['faqs'] = rows
        return data
