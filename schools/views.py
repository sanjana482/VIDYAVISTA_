from django.db.models import Q
from django.http import JsonResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from .models import School, Enquiry, LocationPage
from .serializers import SchoolSerializer, EnquirySerializer, LocationSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def health(request): return Response({'ok':True,'service':'VidyaVista API','database':'configured'})

class SchoolViewSet(viewsets.ModelViewSet):
    serializer_class=SchoolSerializer
    lookup_field='school_id'
    lookup_url_kwarg='school_id'
    def get_permissions(self): return [AllowAny()] if self.action in ('list','retrieve') else [IsAdminUser()]
    def get_queryset(self):
        qs=School.objects.prefetch_related('fee_components')
        if self.action in ('list','retrieve'): qs=qs.filter(isActive=True)
        p=self.request.query_params
        for field in ('city','state','board','type'):
            value=p.get(field)
            if value: qs=qs.filter(**{field+'__iexact':value})
        search=p.get('search') or p.get('q')
        if search: qs=qs.filter(Q(name__icontains=search)|Q(area__icontains=search)|Q(city__icontains=search))
        if p.get('topRated')=='true': qs=qs.filter(topRated=True)
        return qs
    def list(self,request,*args,**kwargs):
        qs=self.filter_queryset(self.get_queryset())
        page=self.paginate_queryset(qs)
        data=self.get_serializer(page if page is not None else qs,many=True).data
        if page is not None:
            response=self.get_paginated_response(data)
            response.data={'data':response.data['results'],'meta':{'page':int(request.query_params.get('page',1)),'pages':response.data.get('count',0)//self.paginator.page_size + (1 if response.data.get('count',0)%self.paginator.page_size else 0),'total':response.data.get('count',0)}}
            return response
        return Response({'data':data,'meta':{'pages':1,'total':len(data)}})
    def retrieve(self,request,*args,**kwargs): return Response({'data':self.get_serializer(self.get_object()).data})
    def create(self,request,*args,**kwargs):
        s=self.get_serializer(data=request.data); s.is_valid(raise_exception=True); s.save(); return Response({'data':s.data},status=201)
    def update(self,request,*args,**kwargs):
        partial=kwargs.pop('partial',False); obj=self.get_object(); s=self.get_serializer(obj,data=request.data,partial=partial); s.is_valid(raise_exception=True); s.save(); return Response({'data':s.data})

class EnquiryViewSet(viewsets.ModelViewSet):
    queryset=Enquiry.objects.all(); serializer_class=EnquirySerializer
    http_method_names=['get','post','patch','delete','head','options']
    def get_permissions(self): return [AllowAny()] if self.action=='create' else [IsAdminUser()]
    def create(self,request,*args,**kwargs):
        s=self.get_serializer(data=request.data); s.is_valid(raise_exception=True); s.save(); return Response({'ok':True,'data':s.data},status=201)

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
