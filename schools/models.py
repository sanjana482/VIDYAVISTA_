from django.db import models
from django.utils.text import slugify

class School(models.Model):
    SCHOOL_TYPES=[('Day','Day'),('Play School','Play School'),('Boarding School','Boarding School')]
    BOARDS=[('CBSE','CBSE'),('ICSE','ICSE'),('IB','IB'),('Cambridge','Cambridge'),('State Board','State Board')]
    GENDERS=[('Co-ed','Co-ed'),('Girls','Girls'),('Boys','Boys')]
    school_id=models.PositiveIntegerField(unique=True, null=True, blank=True, db_column='schoolId')
    slug=models.SlugField(max_length=240, unique=True, blank=True)
    name=models.CharField(max_length=240)
    area=models.CharField(max_length=180)
    city=models.CharField(max_length=120, db_index=True)
    state=models.CharField(max_length=120, db_index=True, blank=True, default='')
    board=models.CharField(max_length=40, choices=BOARDS, default='CBSE', db_index=True)
    grades=models.CharField(max_length=80, blank=True, default='')
    type=models.CharField(max_length=30, choices=SCHOOL_TYPES, default='Day', db_index=True)
    gender=models.CharField(max_length=20, choices=GENDERS, default='Co-ed')
    rating=models.DecimalField(max_digits=2, decimal_places=1, default=0)
    reviews=models.PositiveIntegerField(default=0)
    fee=models.PositiveIntegerField(default=0)
    feeMin=models.PositiveIntegerField('Minimum yearly fee (₹)', default=0, help_text='Sabse kam saalana fee, jaise 80000')
    feeMax=models.PositiveIntegerField('Maximum yearly fee (₹)', default=0, help_text='Sabse zyada saalana fee, jaise 150000')
    facilities=models.JSONField(default=list, blank=True)
    photos=models.PositiveIntegerField(default=0)
    topRated=models.BooleanField(default=False)
    phone=models.CharField(max_length=30, blank=True, default='')
    image=models.URLField(max_length=1000, blank=True, default='')
    isActive=models.BooleanField(default=True)
    about=models.TextField(blank=True, default='')
    highlights=models.JSONField(default=list, blank=True)
    faqs=models.JSONField(default=list, blank=True)
    gallery=models.JSONField(default=list, blank=True)
    feeSlabs=models.JSONField(default=list, blank=True)
    feeNote=models.TextField(blank=True, default='')
    feeUpdated=models.CharField(max_length=40, blank=True, default='')
    profile=models.JSONField(default=dict, blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        ordering=['school_id','name']
    def clean(self):
            from django.core.exceptions import ValidationError
            if self.feeMin and self.feeMax and self.feeMax < self.feeMin:
                raise ValidationError('Maximum fee minimum fee se kam nahi ho sakta.')
                
    def save(self,*args,**kwargs):
        
        if self.feeMin:
            self.fee=self.feeMin
        # ... baaki purana code waisa hi rahega    
        if not self.school_id:
            last=School.objects.order_by('-school_id').values_list('school_id',flat=True).first() or 0
            self.school_id=last+1
        if not self.slug:
            base=slugify(f'{self.name}-{self.area}-{self.city}')[:220] or 'school'
            candidate=base; n=2
            while School.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                candidate=f'{base}-{n}'; n+=1
            self.slug=candidate
        super().save(*args,**kwargs)
    def __str__(self): return self.name

class Enquiry(models.Model):
    STATUS=[('new','New'),('contacted','Contacted'),('converted','Converted'),('closed','Closed')]
    school=models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL, related_name='enquiries')
    schoolId=models.PositiveIntegerField(null=True, blank=True)
    schoolName=models.CharField(max_length=240)
    childName=models.CharField(max_length=120,blank=True,default='')
    className=models.CharField(max_length=80,blank=True,default='')
    session=models.CharField(max_length=50,blank=True,default='')
    parentName=models.CharField(max_length=120)
    relation=models.CharField(max_length=50,blank=True,default='')
    mobile=models.CharField(max_length=10)
    email=models.EmailField(blank=True,default='')
    city=models.CharField(max_length=120,blank=True,default='')
    note=models.CharField(max_length=500,blank=True,default='')
    source=models.CharField(max_length=500,blank=True,default='')
    preference=models.JSONField(default=dict,blank=True)
    status=models.CharField(max_length=20,choices=STATUS,default='new')
    adminNote=models.CharField(max_length=1000,blank=True,default='')
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta: ordering=['-created_at']
    def __str__(self): return f'{self.parentName} - {self.schoolName}'

class LocationPage(models.Model):
    KIND=[('state','State'),('city','City')]
    kind=models.CharField(max_length=10,choices=KIND,db_index=True)
    name=models.CharField(max_length=120)
    slug=models.SlugField(max_length=150)
    state=models.CharField(max_length=120,blank=True,default='')
    title=models.CharField(max_length=240,blank=True,default='')
    metaTitle=models.CharField(max_length=240,blank=True,default='')
    description=models.TextField(blank=True,default='')
    photos=models.JSONField(default=list,blank=True)
    faqs=models.JSONField(default=list,blank=True)
    isActive=models.BooleanField(default=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=['kind','slug'],name='unique_location_kind_slug')]
    def save(self,*args,**kwargs):
        if not self.slug: self.slug=slugify(self.name)
        super().save(*args,**kwargs)
    def __str__(self): return f'{self.kind}: {self.name}'
CLASS_CHOICES=[('','All classes'),('Nursery','Nursery'),('KG','KG')]+[(f'Class {n}',f'Class {n}') for n in range(1,13)]

class FeeComponent(models.Model):
    FREQ=[('One-time','One-time'),('Monthly','Monthly'),('Annually','Annually')]
    SESSIONS=[('2027-28','2027-28'),('2026-27','2026-27')]
    school=models.ForeignKey(School,on_delete=models.CASCADE,related_name='fee_components')
    session=models.CharField(max_length=10,choices=SESSIONS,default='2027-28')
    class_name=models.CharField('Class',max_length=20,choices=CLASS_CHOICES,blank=True,default='',help_text='Khali = saari classes ke liye')
    name=models.CharField('Fee name',max_length=120,help_text='jaise Tuition fee, Admission fee, Transport fee')
    frequency=models.CharField(max_length=10,choices=FREQ,default='Annually')
    amount=models.PositiveIntegerField('Amount (₹)')
    class Meta:
        ordering=['session','class_name','id']
    def __str__(self): return f'{self.name} - {self.amount}'