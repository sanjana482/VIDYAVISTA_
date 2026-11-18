"""Public blog API (read-only). Posts are written in Django admin only.

GET /api/blog/            -> {data: [...cards], categories: [...]}
GET /api/blog/<slug>/     -> {data: {...full post...}}
"""
import math
import re

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import BlogPost
from .serializers import file_or_url

_SCRIPT = re.compile(r'<\s*(script|style|iframe|object|embed)[^>]*>.*?<\s*/\s*\1\s*>', re.I | re.S)
_ON_ATTR = re.compile(r'\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', re.I)
_JS_URL = re.compile(r'(href|src)\s*=\s*("|\')\s*javascript:[^"\']*("|\')', re.I)
_TAGS = re.compile(r'<[^>]+>')


def clean_html(html):
    """Admin content is trusted, this is only a safety net."""
    html = _SCRIPT.sub('', html or '')
    html = _ON_ATTR.sub('', html)
    return _JS_URL.sub(r'\1="#"', html)


def _minutes(html):
    words = len(_TAGS.sub(' ', html or '').split())
    return max(1, math.ceil(words / 200))


def _live():
    return BlogPost.objects.filter(is_published=True, published_at__lte=timezone.localdate())


def _card(p, request):
    return {
        'slug': p.slug,
        'title': p.title,
        'excerpt': p.excerpt,
        'category': p.category,
        'date': p.published_at.isoformat(),
        'author': p.author,
        'cover': file_or_url(request, p.cover_image, '') or '',
        'coverAlt': p.cover_alt or p.title,
        'readingMinutes': _minutes(p.body),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def blog_list(request):
    qs = _live()
    cat = request.query_params.get('category')
    if cat:
        qs = qs.filter(category__iexact=cat)
    limit = request.query_params.get('limit')
    if limit and limit.isdigit():
        qs = qs[: int(limit)]
    cats = sorted(set(_live().values_list('category', flat=True)))
    return Response({'data': [_card(p, request) for p in qs], 'categories': cats})


@api_view(['GET'])
@permission_classes([AllowAny])
def blog_detail(request, slug):
    p = _live().filter(slug=slug).first()
    if not p:
        return Response({'detail': 'not found'}, status=404)
    d = _card(p, request)
    d.update({
        'bodyHtml': clean_html(p.body),
        'metaTitle': p.meta_title or p.title,
        'metaDescription': p.meta_description or p.excerpt,
        'updatedAt': p.updated_at.date().isoformat(),
        'cta': {'label': p.cta_label, 'href': p.cta_url} if p.cta_label and p.cta_url else None,
    })
    related = _live().filter(category=p.category).exclude(pk=p.pk)[:3]
    d['related'] = [_card(r, request) for r in related]
    return Response({'data': d})
