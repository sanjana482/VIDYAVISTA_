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

        # ---- cover image: file upload wins, else link
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
        data['owner'] = None if not o else {
            'name': o.name, 'designation': o.designation, 'bio': o.bio, 'email': o.email, 'phone': o.phone,
            'photo': file_or_url(req, o.photo, o.photo_url),
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
                  'topRated', 'isFeatured', 'isRecommended', 'phone', 'landline')

    def to_representation(self, obj):
        data = super().to_representation(obj)
        req = self.context.get('request')
        data['image'] = file_or_url(req, obj.cover_image, obj.image)
        data['phone'] = ' / '.join(x for x in (obj.phone, obj.landline) if x)
        data.pop('landline', None)
        data['photos'] = len(obj.photo_items.all()) or obj.photos
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
        if len(v.strip()) < 20:
            raise serializers.ValidationError('Please write at least 20 characters.')
        return v.strip()

    def create(self, validated):
        sid = validated.pop('schoolId')
        try:
            school = School.objects.get(school_id=sid, isActive=True)
        except School.DoesNotExist:
            raise serializers.ValidationError({'schoolId': 'School not found.'})
        return Review.objects.create(school=school, is_approved=False, **validated)


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
