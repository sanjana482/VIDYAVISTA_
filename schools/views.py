import re
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from .models import School, Enquiry, LocationPage, Review, ParentProfile, CounsellorLead
from .serializers import SchoolSerializer, SchoolListSerializer, EnquirySerializer, LocationSerializer, ReviewSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request): return Response({'ok':True,'service':'VidyaVista API','database':'configured'})


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_counsellor_request(request):
    data = request.data
    name = (data.get('name') or '').strip()
    mobile = (data.get('mobile') or '').strip()
    child_class = (data.get('child_class') or data.get('className') or '').strip()
    city = (data.get('city') or '').strip()
    board = (data.get('board') or '').strip()
    budget = (data.get('budget') or '').strip()
    notes = (data.get('notes') or '').strip()
    source = (data.get('source') or 'Website Counsellor Panel').strip()

    if not name:
        return Response({'ok': False, 'error': 'Please enter your name.'}, status=status.HTTP_400_BAD_REQUEST)

    cleaned_mobile = re.sub(r'\D', '', mobile)
    if len(cleaned_mobile) > 10 and cleaned_mobile.startswith('91'):
        cleaned_mobile = cleaned_mobile[2:]
    if len(cleaned_mobile) != 10 or not cleaned_mobile[0] in '6789':
        return Response({'ok': False, 'error': 'Please enter a valid 10-digit Indian mobile number.'}, status=status.HTTP_400_BAD_REQUEST)

    lead = CounsellorLead.objects.create(
        name=name,
        mobile=cleaned_mobile,
        child_class=child_class,
        city=city,
        board=board,
        budget=budget,
        notes=notes,
        source=source,
    )

    return Response({
        'ok': True,
        'message': 'Your counselling request has been received! Our expert counsellor will connect with you shortly.',
        'lead_id': lead.id,
    }, status=status.HTTP_201_CREATED)

class SchoolPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'limit'   # /api/schools/?limit=300
    max_page_size = 500


class SchoolViewSet(viewsets.ModelViewSet):
    lookup_field = 'school_id'
    lookup_url_kwarg = 'school_id'
    pagination_class = SchoolPagination
    PUBLIC = ('list', 'retrieve', 'by_slug')

    def get_serializer_class(self):
        return SchoolListSerializer if self.action == 'list' else SchoolSerializer

    def get_permissions(self):
        return [AllowAny()] if self.action in self.PUBLIC else [IsAdminUser()]

    def get_queryset(self):
        if self.action == 'list':
            qs = School.objects.select_related('owner').prefetch_related(
                'school_accounts'
            )
        else:
            qs = School.objects.select_related('owner').prefetch_related(
                'fee_components', 'highlight_items', 'faq_items', 'photo_items', 'school_accounts', 'review_items'
            )

        if self.action in self.PUBLIC:
            qs = qs.filter(isActive=True)

        p = self.request.query_params
        for field in ('city', 'state', 'board', 'type'):
            value = p.get(field)
            if value: qs = qs.filter(**{field + '__iexact': value})
        search = p.get('search') or p.get('q')
        if search: qs = qs.filter(Q(name__icontains=search) | Q(area__icontains=search) | Q(city__icontains=search))
        if p.get('topRated') == 'true': qs = qs.filter(topRated=True)
        if p.get('featured') == 'true': qs = qs.filter(isFeatured=True)
        if p.get('recommended') == 'true': qs = qs.filter(isRecommended=True)
        return qs.order_by('school_id', 'id')

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        data = self.get_serializer(page if page is not None else qs, many=True).data
        if page is not None:
            pg = self.paginator.page.paginator
            return Response({'data': data, 'meta': {'page': self.paginator.page.number, 'pages': pg.num_pages, 'total': pg.count}})
        return Response({'data': data, 'meta': {'pages': 1, 'total': len(data)}})

    def retrieve(self, request, *args, **kwargs):
        return Response({'data': self.get_serializer(self.get_object()).data})

    @action(detail=False, methods=['get'], url_path=r'by-slug/(?P<slug>[^/.]+)')
    def by_slug(self, request, slug=None):
        """GET /api/schools/by-slug/<slug>/ -> one school (this is what the school page uses)."""
        obj = get_object_or_404(self.get_queryset(), slug=slug)
        return Response({'data': self.get_serializer(obj).data})

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data); s.is_valid(raise_exception=True); s.save()
        return Response({'data': s.data}, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False); obj = self.get_object()
        s = self.get_serializer(obj, data=request.data, partial=partial); s.is_valid(raise_exception=True); s.save()
        return Response({'data': s.data})

class EnquiryViewSet(viewsets.ModelViewSet):
    queryset=Enquiry.objects.all(); serializer_class=EnquirySerializer
    http_method_names=['get','post','patch','delete','head','options']
    def get_permissions(self): return [AllowAny()] if self.action=='create' else [IsAdminUser()]
    def create(self,request,*args,**kwargs):
        s=self.get_serializer(data=request.data); s.is_valid(raise_exception=True)
        parent_user = request.user if (request.user and request.user.is_authenticated) else None
        if not parent_user:
            pp = ParentProfile.objects.filter(mobile=s.validated_data.get('mobile','')).select_related('user').first()
            if pp:
                parent_user = pp.user
        obj = s.save(parent_user=parent_user)
        return Response({'ok':True,'data':self.get_serializer(obj).data},status=201)

class LocationViewSet(viewsets.ModelViewSet):
    serializer_class=LocationSerializer
    lookup_field='slug'
    def get_permissions(self): return [AllowAny()] if self.action in ('list','retrieve') else [IsAdminUser()]
    def get_queryset(self):
        qs=LocationPage.objects.all()
        if self.action in ('list','retrieve'): qs=qs.filter(isActive=True)
        kind=self.request.query_params.get('kind')
        if kind: qs=qs.filter(kind=kind)
        return qs


class ReviewViewSet(viewsets.GenericViewSet):
    """GET /api/reviews/?schoolId=... to list approved reviews; POST /api/reviews/ to submit."""
    queryset = Review.objects.none()
    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]
    throttle_classes = []

    def list(self, request, *args, **kwargs):
        school_id = request.query_params.get('schoolId') or request.query_params.get('school')
        slug_val = request.query_params.get('slug')
        if not school_id and not slug_val:
            return Response({'ok': True, 'data': [], 'breakdown': {}, 'parameters': {}})

        school = None
        # 1. Exact lookup by slug if provided
        if slug_val:
            school = School.objects.filter(slug=slug_val).first()

        # 2. Exact lookup by school_id (public ID used across frontend)
        if not school and school_id and str(school_id).isdigit():
            school = School.objects.filter(school_id=int(school_id)).first()

        # 3. Lookup by slug in school_id param
        if not school and school_id:
            school = School.objects.filter(slug=str(school_id)).first()

        # 4. Fallback to pk only if neither matches
        if not school and school_id and str(school_id).isdigit():
            school = School.objects.filter(pk=int(school_id)).first()

        if not school:
            return Response({'ok': True, 'data': [], 'breakdown': {}, 'parameters': {}})

        qs = list(school.review_items.filter(is_approved=True).order_by('-created_at'))
        total_count = len(qs)

        # Star breakdown (5★ to 1★)
        counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        sports_scores = []
        extra_scores = []
        value_scores = []
        acad_scores = []
        infra_scores = []
        safety_scores = []

        data = []
        for r in qs:
            counts[r.rating] = counts.get(r.rating, 0) + 1
            if r.rating_sports: sports_scores.append(r.rating_sports)
            if r.rating_extracurricular: extra_scores.append(r.rating_extracurricular)
            if r.rating_value: value_scores.append(r.rating_value)
            if r.rating_academics: acad_scores.append(r.rating_academics)
            if r.rating_infrastructure: infra_scores.append(r.rating_infrastructure)
            if r.rating_safety: safety_scores.append(r.rating_safety)

            data.append({
                'id': r.pk,
                'name': r.name,
                'role': r.role or 'Parent',
                'rating': r.rating,
                'text': r.text,
                'date': r.created_at.date().isoformat() if r.created_at else '',
                'ratingSports': r.rating_sports,
                'ratingExtracurricular': r.rating_extracurricular,
                'ratingValue': r.rating_value,
                'ratingAcademics': r.rating_academics,
                'ratingInfrastructure': r.rating_infrastructure,
                'ratingSafety': r.rating_safety,
                'photos': r.photos if isinstance(r.photos, list) else [],
                'isVerified': True,  # All approved reviews get the verified user badge
                'schoolReply': r.school_reply if r.reply_approved else '',
                'replyDate': r.school_reply_at.date().isoformat() if (r.school_reply_at and r.reply_approved) else '',
                'schoolName': school.name,
            })

        breakdown = {}
        for star in (5, 4, 3, 2, 1):
            c = counts[star]
            pct = round((c / total_count * 100), 1) if total_count > 0 else 0
            breakdown[star] = {'count': c, 'pct': pct}

        def _avg(lst):
            return round(sum(lst) / len(lst), 1) if lst else 0.0

        avg_acad = _avg(acad_scores)
        avg_infra = _avg(infra_scores)
        avg_sports = _avg(sports_scores)
        avg_extra = _avg(extra_scores)
        avg_safety = _avg(safety_scores)
        avg_value = _avg(value_scores)

        param_map = {
            'Academics': avg_acad,
            'Infrastructure': avg_infra,
            'Sports': avg_sports,
            'Extracurriculars': avg_extra,
            'Safety & Hygiene': avg_safety,
            'Value for Money': avg_value,
        }
        valid_params = {k: v for k, v in param_map.items() if v > 0}
        highest_rated = max(valid_params, key=valid_params.get) if valid_params else "Not rated yet"

        parameters = {
            'academics': avg_acad,
            'infrastructure': avg_infra,
            'sports': avg_sports,
            'extracurricular': avg_extra,
            'safety': avg_safety,
            'valueForMoney': avg_value,
            'highestRated': highest_rated,
        }

        # Real overall rating: only from approved reviews
        if total_count > 0 and school.rating and float(school.rating) > 0:
            overall_rating = round(float(school.rating), 1)
        elif total_count > 0 and valid_params:
            overall_rating = round(sum(valid_params.values()) / len(valid_params), 1)
        else:
            overall_rating = 0.0

        return Response({
            'ok': True,
            'data': data,
            'rating': overall_rating,
            'count': total_count,
            'breakdown': breakdown,
            'parameters': parameters,
            'schoolName': school.name,
        })

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        obj = s.save()
        return Response({
            'ok': True,
            'message': 'Your review has been submitted for verification. It will appear with a Verified User badge once approved by the VidyaVista moderation team.',
            'review': {
                'id': obj.pk,
                'name': obj.name,
                'role': obj.role,
                'rating': obj.rating,
                'text': obj.text,
                'date': obj.created_at.date().isoformat() if obj.created_at else '',
                'isApproved': False,
            }
        }, status=201)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_photo(self, request):
        """Allows parents to attach up to 5 campus/event photos with their review."""
        f = request.FILES.get('file') or request.FILES.get('photo') or request.FILES.get('image')
        if not f:
            return Response({'ok': False, 'message': 'No image file provided.'}, status=400)
        ext = (f.name.rsplit('.', 1)[-1] if '.' in f.name else '').lower()
        if ext not in ('jpg', 'jpeg', 'png', 'webp'):
            return Response({'ok': False, 'message': 'Only JPG, PNG, and WEBP images are allowed.'}, status=400)
        if f.size > 8 * 1024 * 1024:
            return Response({'ok': False, 'message': 'Image size cannot exceed 8 MB.'}, status=400)

        from django.core.files.storage import default_storage
        from django.utils import timezone
        from django.utils.text import slugify
        safe_stem = slugify(f.name.rsplit('.', 1)[0])[:40] or 'review_photo'
        ts = int(timezone.now().timestamp())
        filename = f"reviews/{safe_stem}_{ts}.{ext}"
        saved_name = default_storage.save(filename, f)
        url = default_storage.url(saved_name)
        full_url = request.build_absolute_uri(url) if url.startswith('/') else url
        return Response({'ok': True, 'url': full_url})


from django.utils.text import slugify as _slugify


def _norm_state(s):
    return (s.state or '').strip()


@api_view(['GET'])
@permission_classes([AllowAny])
def location_detail(request, kind, slug):
    """GET /api/locations/<state|city>/<slug>  ->  {data: {...}} (admin ne jo likha hai)"""
    obj = LocationPage.objects.filter(kind=kind, slug=slug, isActive=True).first()
    if not obj:
        return Response({'detail': 'not found'}, status=404)
    return Response({'data': LocationSerializer(obj, context={'request': request}).data})


@api_view(['GET'])
@permission_classes([AllowAny])
def location_index(request):
    """GET /api/locations/index  ->  state > city > type/board counts (sirf jin jagah school hain)."""
    tree = {}
    for s in School.objects.filter(isActive=True).only('state', 'city', 'type', 'board'):
        st = _norm_state(s) or 'Other'
        stype = 'Day School' if s.type == 'Day' else s.type
        node = tree.setdefault(st, {'state': st, 'slug': _slugify(st), 'count': 0, 'types': {}, 'boards': {}, 'cities': {}})
        city = node['cities'].setdefault(s.city, {'name': s.city, 'slug': _slugify(s.city), 'count': 0, 'types': {}, 'boards': {}})
        for n in (node, city):
            n['count'] += 1
            n['types'][stype] = n['types'].get(stype, 0) + 1
            n['boards'][s.board] = n['boards'].get(s.board, 0) + 1
    out = []
    for st in sorted(tree):
        n = tree[st]
        n['cities'] = sorted(n['cities'].values(), key=lambda c: -c['count'])
        out.append(n)
    return Response({'data': out})
