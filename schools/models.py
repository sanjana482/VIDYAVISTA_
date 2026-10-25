from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Avg, Count
from django.utils.text import slugify

# ---------------------------------------------------------------- validators
mobile_validator = RegexValidator(r'^[6-9]\d{9}$', 'Sirf 10 digit ka mobile number likhein (letters / space / +91 nahi).')
landline_validator = RegexValidator(r'^\d{6,13}$', 'Sirf digits likhein, STD code ke saath. Jaise 01126543210 (letters / space / dash nahi).')

# ---------------------------------------------------------------- choices
ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
GRADE_CHOICES = [('Toddler', 'Toddler'), ('Nursery', 'Nursery'), ('LKG', 'LKG'), ('UKG', 'UKG')] + [
    (f'Class {n}', f'Class {n} ({ROMAN[n - 1]})') for n in range(1, 13)
]

# NOTE: stored values (left) are the same as before so old data + website filters keep working.
# Only the labels (right) shown in the admin changed.
BOARDS = [
    ('CBSE', 'CBSE'),
    ('State Board', 'State Board'),
    ('ICSE', 'ICSE / CISCE'),
    ('No Board', 'No Board'),
    ('Cambridge', 'Cambridge / IGCSE'),
    ('IB', 'IB Board'),
    ('NIOS', 'NIOS'),
]

FACILITY_CHOICES = [
    'Transport', 'Sports', 'Science labs', 'Library', 'Computer lab', 'Hostel', 'Swimming pool',
    'Smart classes', 'Music & Arts', 'Cafeteria', 'Medical room', 'CCTV', 'Playground', 'Auditorium',
]


class Owner(models.Model):
    """School ka owner / founder / chairman. Pehle yahan owner banao, phir School me select karo."""
    name = models.CharField('Owner name', max_length=160)
    designation = models.CharField(max_length=120, blank=True, default='', help_text='Jaise: Founder & Chairman')
    photo = models.ImageField('Photo (file)', upload_to='owners/', blank=True)
    photo_url = models.URLField('Photo link (URL)', max_length=1000, blank=True, default='')
    phone = models.CharField(max_length=10, blank=True, default='', validators=[mobile_validator])
    email = models.EmailField(blank=True, default='')
    bio = models.TextField('About owner', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class School(models.Model):
    SCHOOL_TYPES = [('Day', 'Day'), ('Play School', 'Play School'), ('Boarding School', 'Boarding School')]
    GENDERS = [('Co-ed', 'Co-ed'), ('Girls', 'Girls'), ('Boys', 'Boys')]

    school_id = models.PositiveIntegerField(unique=True, null=True, blank=True, db_column='schoolId')
    slug = models.SlugField(max_length=240, unique=True, blank=True)
    name = models.CharField(max_length=240)
    owner = models.ForeignKey(Owner, null=True, blank=True, on_delete=models.SET_NULL, related_name='schools')
    area = models.CharField(max_length=180)
    city = models.CharField(max_length=120, db_index=True)
    state = models.CharField(max_length=120, db_index=True, blank=True, default='')
    address = models.CharField('Full address', max_length=400, blank=True, default='')
    board = models.CharField(max_length=40, choices=BOARDS, default='CBSE', db_index=True)
    grade_from = models.CharField('Grades from', max_length=20, choices=GRADE_CHOICES, blank=True, default='')
    grade_to = models.CharField('Grades to', max_length=20, choices=GRADE_CHOICES, blank=True, default='')
    grades = models.CharField(max_length=80, blank=True, default='', editable=False)  # auto: "Toddler – Class 12"
    type = models.CharField(max_length=30, choices=SCHOOL_TYPES, default='Day', db_index=True)
    gender = models.CharField(max_length=20, choices=GENDERS, default='Co-ed')

    # rating / reviews are calculated from parent reviews (see Review below)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0, editable=False)
    reviews = models.PositiveIntegerField(default=0, editable=False)

    fee = models.PositiveIntegerField(default=0)
    feeMin = models.PositiveIntegerField('Minimum yearly fee (₹)', default=0, help_text='Sabse kam saalana fee, jaise 80000')
    feeMax = models.PositiveIntegerField('Maximum yearly fee (₹)', default=0, help_text='Sabse zyada saalana fee, jaise 150000')
    facilities = models.JSONField(default=list, blank=True)
    photos = models.PositiveIntegerField(default=0)

    # homepage sections (tick = school wahan dikhega)
    topRated = models.BooleanField('Top rated badge', default=False, help_text='Listing par "Top rated" badge')
    isFeatured = models.BooleanField('Featured school', default=False, help_text='Tick karo to homepage ke "Featured Schools" me dikhega')
    isRecommended = models.BooleanField('Recommended school', default=False, help_text='Tick karo to homepage ke "Recommended Schools" me dikhega')

    phone = models.CharField('Mobile number', max_length=30, blank=True, default='', validators=[mobile_validator],
                             help_text='Sirf 10 digits')
    landline = models.CharField('Telephone (landline) number', max_length=13, blank=True, default='',
                                validators=[landline_validator], help_text='STD code ke saath, sirf digits. Jaise 01126543210')
    email = models.EmailField(blank=True, default='')
    website = models.URLField('School website', max_length=300, blank=True, default='', help_text='https://... ke saath')

    cover_image = models.ImageField('Cover image (file upload)', upload_to='schools/cover/', blank=True)
    image = models.URLField('Cover image link (URL)', max_length=1000, blank=True, default='',
                            help_text='File upload ya link - dono me se koi ek. File ho to wahi use hoti hai.')

    isActive = models.BooleanField(default=True)
    about = models.TextField(blank=True, default='')

    # school details
    established = models.PositiveSmallIntegerField('Established (year)', null=True, blank=True,
                                                   validators=[MinValueValidator(1800), MaxValueValidator(2100)])
    students = models.PositiveIntegerField('Total students', null=True, blank=True)
    teachers = models.PositiveIntegerField('Total teachers', null=True, blank=True)
    campus = models.CharField('Campus size', max_length=80, blank=True, default='', help_text='Jaise: 5 acres')

    # social links
    youtube_url = models.URLField('YouTube', max_length=300, blank=True, default='')
    facebook_url = models.URLField('Facebook', max_length=300, blank=True, default='')
    instagram_url = models.URLField('Instagram', max_length=300, blank=True, default='')
    x_url = models.URLField('X (Twitter)', max_length=300, blank=True, default='')
    linkedin_url = models.URLField('LinkedIn', max_length=300, blank=True, default='')
    other_url = models.URLField('Other link', max_length=300, blank=True, default='')

    # old JSON fields: kept so old data is not lost. New data goes in the inline tables below.
    highlights = models.JSONField(default=list, blank=True)
    faqs = models.JSONField(default=list, blank=True)
    gallery = models.JSONField(default=list, blank=True)
    feeSlabs = models.JSONField(default=list, blank=True)
    feeNote = models.TextField(blank=True, default='')
    feeUpdated = models.CharField(max_length=40, blank=True, default='')
    profile = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['school_id', 'name']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.feeMin and self.feeMax and self.feeMax < self.feeMin:
            raise ValidationError('Maximum fee minimum fee se kam nahi ho sakta.')
        if self.grade_from and self.grade_to:
            order = [g for g, _ in GRADE_CHOICES]
            if order.index(self.grade_to) < order.index(self.grade_from):
                raise ValidationError('"Grades to" "Grades from" se pehle ki class nahi ho sakti.')

    def refresh_rating(self):
        """Parents ke approved reviews se average rating + count nikalta hai."""
        agg = self.review_items.filter(is_approved=True).aggregate(a=Avg('rating'), c=Count('id'))
        avg = Decimal(str(round(agg['a'] or 0, 1)))
        School.objects.filter(pk=self.pk).update(rating=avg, reviews=agg['c'] or 0)

    def save(self, *args, **kwargs):
        if self.feeMin:
            self.fee = self.feeMin
        if self.grade_from and self.grade_to:
            self.grades = f'{self.grade_from} – {self.grade_to}'
        if not self.school_id:
            last = School.objects.order_by('-school_id').values_list('school_id', flat=True).first() or 0
            self.school_id = last + 1
        if not self.slug:
            base = slugify(f'{self.name}-{self.area}-{self.city}')[:220] or 'school'
            candidate = base
            n = 2
            while School.objects.exclude(pk=self.pk).filter(slug=candidate).exists():
                candidate = f'{base}-{n}'
                n += 1
            self.slug = candidate
        super().save(*args, **kwargs)
        self.ensure_locations()

    def ensure_locations(self):
        """School save hote hi uska state aur city "Location pages" me apne aap aa jate hain.
        Title khali rehta hai (site khud banati hai); description / highlights / FAQs baad me admin me bharo."""
        st = (self.state or '').strip()
        ct = (self.city or '').strip()
        if st and slugify(st):
            LocationPage.objects.get_or_create(kind='state', slug=slugify(st), defaults={'name': st})
        if ct and slugify(ct):
            LocationPage.objects.get_or_create(kind='city', slug=slugify(ct), defaults={'name': ct, 'state': st})

    def __str__(self):
        return self.name


class SchoolHighlight(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='highlight_items')
    text = models.CharField('Highlight', max_length=300)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text


class SchoolFAQ(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='faq_items')
    question = models.CharField(max_length=300)
    answer = models.TextField()
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question


class SchoolPhoto(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='photo_items')
    image = models.ImageField('Photo (file)', upload_to='schools/gallery/', blank=True)
    image_url = models.URLField('Photo link (URL)', max_length=1000, blank=True, default='')
    caption = models.CharField(max_length=160, blank=True, default='')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.image and not self.image_url:
            raise ValidationError('Photo file choose karo ya link (URL) daalo.')

    def __str__(self):
        return self.caption or f'Photo {self.pk}'


class Review(models.Model):
    """Parent / student ka review. Approve hone ke baad hi school ki rating me judta hai."""
    ROLES = [('Parent', 'Parent'), ('Student', 'Student'), ('Alumni', 'Alumni'), ('Staff', 'Staff')]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='review_items')
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=ROLES, default='Parent')
    mobile = models.CharField(max_length=10, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    text = models.TextField()
    is_approved = models.BooleanField('Approved', default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.school.refresh_rating()

    def delete(self, *args, **kwargs):
        school = self.school
        super().delete(*args, **kwargs)
        school.refresh_rating()

    def __str__(self):
        return f'{self.name} - {self.school.name} ({self.rating}★)'


class Enquiry(models.Model):
    STATUS = [('new', 'New'), ('contacted', 'Contacted'), ('converted', 'Converted'), ('closed', 'Closed')]
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL, related_name='enquiries')
    schoolId = models.PositiveIntegerField(null=True, blank=True)
    schoolName = models.CharField(max_length=240)
    childName = models.CharField(max_length=120, blank=True, default='')
    className = models.CharField(max_length=80, blank=True, default='')
    session = models.CharField(max_length=50, blank=True, default='')
    parentName = models.CharField(max_length=120)
    relation = models.CharField(max_length=50, blank=True, default='')
    mobile = models.CharField(max_length=10)
    email = models.EmailField(blank=True, default='')
    city = models.CharField(max_length=120, blank=True, default='')
    note = models.CharField(max_length=500, blank=True, default='')
    source = models.CharField(max_length=500, blank=True, default='')
    preference = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='new')
    adminNote = models.CharField(max_length=1000, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.parentName} - {self.schoolName}'


class LocationPage(models.Model):
    KIND = [('state', 'State'), ('city', 'City')]
    kind = models.CharField(max_length=10, choices=KIND, db_index=True)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=150)
    state = models.CharField(max_length=120, blank=True, default='')
    title = models.CharField(max_length=240, blank=True, default='')
    metaTitle = models.CharField(max_length=240, blank=True, default='')
    description = models.TextField(blank=True, default='')
    image = models.ImageField('Card photo (file)', upload_to='locations/', blank=True,
                              help_text='Homepage ke city / state card ki photo')
    image_url = models.URLField('Card photo link (URL)', max_length=1000, blank=True, default='')
    show_on_home = models.BooleanField('Homepage par dikhao', default=False,
                                       help_text='Tick karo to homepage ke Popular cities / states me aayega')
    photos = models.JSONField(default=list, blank=True)
    faqs = models.JSONField(default=list, blank=True)
    isActive = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['kind', 'slug'], name='unique_location_kind_slug')]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.kind}: {self.name}'


class LocationHighlight(models.Model):
    """Key highlights jo city/state page par dikhte hain (admin se edit)."""
    location = models.ForeignKey(LocationPage, on_delete=models.CASCADE, related_name='highlight_items')
    text = models.CharField('Highlight', max_length=300)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text


class LocationFAQ(models.Model):
    location = models.ForeignKey(LocationPage, on_delete=models.CASCADE, related_name='faq_items')
    question = models.CharField(max_length=300)
    answer = models.TextField()
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Location FAQ'
        verbose_name_plural = 'Location FAQs'

    def __str__(self):
        return self.question


CLASS_CHOICES = [('', 'All classes'), ('Nursery', 'Nursery'), ('KG', 'KG')] + [(f'Class {n}', f'Class {n}') for n in range(1, 13)]


class FeeComponent(models.Model):
    FREQ = [('One-time', 'One-time'), ('Monthly', 'Monthly'), ('Annually', 'Annually')]
    SESSIONS = [('2027-28', '2027-28'), ('2026-27', '2026-27')]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='fee_components')
    session = models.CharField(max_length=10, choices=SESSIONS, default='2027-28')
    class_name = models.CharField('Class', max_length=20, choices=CLASS_CHOICES, blank=True, default='', help_text='Khali = saari classes ke liye')
    name = models.CharField('Fee name', max_length=120, help_text='jaise Tuition fee, Admission fee, Transport fee')
    frequency = models.CharField(max_length=10, choices=FREQ, default='Annually')
    amount = models.PositiveIntegerField('Amount (₹)')

    class Meta:
        ordering = ['session', 'class_name', 'id']

    def __str__(self):
        return f'{self.name} - {self.amount}'
