from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Avg, Count, Q
from django.utils import timezone
from django.utils.text import slugify

User = get_user_model()

# ---------------------------------------------------------------- validators
mobile_validator = RegexValidator(r'^[6-9]\d{9}$', 'Enter a 10-digit mobile number only (no letters, spaces or +91).')
landline_validator = RegexValidator(r'^\d{6,13}$', 'Enter digits only, including the STD code. Example: 01126543210 (no letters, spaces or dashes).')

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

ADMISSION_STATUS = [
    ('open', 'Admissions Open'),
    ('closing_soon', 'Closing Soon'),
    ('closed', 'Admissions Closed'),
    ('coming_soon', 'Coming Soon'),
]


class Owner(models.Model):
    """Owner / Founder / Chairman of a school. Linked automatically with School Owner Portal accounts."""
    APPROVAL_STATUS = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    name = models.CharField('Owner Name', max_length=160)
    designation = models.CharField(max_length=120, blank=True, default='Founder / Director', help_text='Example: Founder & Chairman')
    photo = models.ImageField('Photo (file)', upload_to='owners/', blank=True)
    photo_url = models.URLField('Photo link (URL)', max_length=1000, blank=True, default='')
    phone = models.CharField(max_length=10, blank=True, default='', validators=[mobile_validator])
    email = models.EmailField(blank=True, default='')
    city = models.CharField(max_length=120, blank=True, default='')
    state = models.CharField(max_length=120, blank=True, default='')
    bio = models.TextField('About Owner', blank=True, default='')
    approval_status = models.CharField('Approval Status', max_length=20, choices=APPROVAL_STATUS, default='pending', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', 'name']
        verbose_name = 'School Owner Profile'
        verbose_name_plural = 'School Owner Profiles'

    def __str__(self):
        return f"{self.name} ({self.get_approval_status_display()})"


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

    # admission status (shown as a badge, like "Admissions Open for 2027-28")
    admission_status = models.CharField(
        'Admission status', max_length=20, choices=ADMISSION_STATUS, default='open', db_index=True,
        help_text='Shown as a badge on the school listing and profile page.')
    admission_last_date = models.DateField(
        'Last date to apply', null=True, blank=True, help_text='Optional.')

    # rating / reviews are calculated from parent reviews (see Review below)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0, editable=False)
    reviews = models.PositiveIntegerField(default=0, editable=False)

    fee = models.PositiveIntegerField(default=0)
    feeMin = models.PositiveIntegerField('Minimum yearly fee (₹)', default=0, help_text='Lowest yearly fee, for example 80000')
    feeMax = models.PositiveIntegerField('Maximum yearly fee (₹)', default=0, help_text='Highest yearly fee, for example 150000')
    facilities = models.JSONField(default=list, blank=True)
    photos = models.PositiveIntegerField(default=0)

    # homepage sections (tick = the school is shown there)
    topRated = models.BooleanField('Top rated badge', default=False, help_text='Shows a "Top rated" badge on the listing.')
    isFeatured = models.BooleanField('Featured school', default=False, help_text='Tick to show this school in "Featured Schools" on the homepage.')
    isRecommended = models.BooleanField('Recommended school', default=False, help_text='Tick to show this school in "Recommended Schools" on the homepage.')

    phone = models.CharField('Mobile number', max_length=30, blank=True, default='', validators=[mobile_validator],
                             help_text='10 digits only')
    landline = models.CharField('Telephone (landline) number', max_length=13, blank=True, default='',
                                validators=[landline_validator], help_text='With STD code, digits only. Example: 01126543210')
    email = models.EmailField(blank=True, default='')
    website = models.URLField('School website', max_length=300, blank=True, default='', help_text='Include https://')

    cover_image = models.ImageField('Cover image (file upload)', upload_to='schools/cover/', blank=True)
    image = models.URLField('Cover image link (URL)', max_length=1000, blank=True, default='',
                            help_text='Upload a file or paste a link, either one. If a file is uploaded, that is used.')

    isActive = models.BooleanField(default=True)
    about = models.TextField(blank=True, default='')

    established = models.PositiveSmallIntegerField('Established (year)', null=True, blank=True,
                                                   validators=[MinValueValidator(1800), MaxValueValidator(2100)])
    students = models.PositiveIntegerField('Total students', null=True, blank=True)
    teachers = models.PositiveIntegerField('Total teachers', null=True, blank=True)
    campus = models.CharField('Campus size', max_length=80, blank=True, default='', help_text='Example: 5 acres')
    affiliation_no = models.CharField('Affiliation no.', max_length=60, blank=True, default='')
    current_admission_session = models.CharField('Admission session', max_length=20, blank=True, default='',
                                                 help_text='Example: 2027-28')
    student_teacher_ratio = models.CharField('Student : teacher ratio', max_length=20, blank=True, default='')
    school_timing = models.CharField('School timing', max_length=80, blank=True, default='')
    lat = models.FloatField('Latitude', null=True, blank=True)
    lng = models.FloatField('Longitude', null=True, blank=True)
    logo_url = models.URLField('School logo link (URL)', max_length=1000, blank=True, default='')
    facility_groups = models.JSONField(default=dict, blank=True)
    latest_fee_session = models.CharField(max_length=20, blank=True, default='')
    page_last_updated = models.DateField(null=True, blank=True)

    # --- extra fields (for CSV import) ---
    boarding_type = models.CharField('Boarding type', max_length=40, blank=True, default='', help_text='Example: Day Cum Boarding, Full Boarding')
    hostel = models.BooleanField('Hostel available', default=False)
    verified = models.BooleanField('Verified', default=False)
    locality = models.CharField(max_length=180, blank=True, default='')
    pincode = models.CharField(max_length=10, blank=True, default='')
    extra_boards = models.CharField('All boards', max_length=200, blank=True, default='', help_text='Example: CBSE, IB Board')
    medium = models.CharField('Medium', max_length=80, blank=True, default='')
    instruction_language = models.CharField(
        'Language of instruction',
        max_length=80,
        blank=True,
        default='',
    )
    academic_session = models.CharField(
        'Academic session',
        max_length=40,
        blank=True,
        default='',
        help_text='Example: April to March',
    )

    languages = models.JSONField('Languages taught', default=list, blank=True, help_text='Example: ["English", "Hindi"]')
    food_options = models.CharField('Food options', max_length=120, blank=True, default='')
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
            raise ValidationError('Maximum fee cannot be less than minimum fee.')
        if self.grade_from and self.grade_to:
            order = [g for g, _ in GRADE_CHOICES]
            if order.index(self.grade_to) < order.index(self.grade_from):
                raise ValidationError('"Grades to" cannot be earlier than "Grades from".')

    def refresh_rating(self):
        """Calculates the average rating + count from approved parent reviews."""
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
        """As soon as a school is saved, its state and city automatically appear in "Location pages".
        Title stays empty (the site generates it); add description / highlights / FAQs later in the admin."""
        st = (self.state or '').strip()
        ct = (self.city or '').strip()
        if st and slugify(st):
            LocationPage.objects.get_or_create(kind='state', slug=slugify(st), defaults={'name': st})
        if ct and slugify(ct):
            LocationPage.objects.get_or_create(kind='city', slug=slugify(ct), defaults={'name': ct, 'state': st})

    def __str__(self):
        return f"{self.name} ({self.city})" if self.city else self.name


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
    is_approved = models.BooleanField('Approved', default=True)

    class Meta:
        ordering = ['order', 'id']

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.image and not self.image_url:
            raise ValidationError('Choose a photo file or enter a link (URL).')

    def __str__(self):
        return self.caption or f'Photo {self.pk}'


class SchoolAward(models.Model):
    """School onboarding wizard step: Awards & Recognition."""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='award_items')
    name = models.CharField('Award / Recognition Name', max_length=240)
    position = models.CharField('Position / Rank', max_length=120, blank=True, default='')
    year = models.CharField('Year', max_length=10, blank=True, default='')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', '-year', 'id']
        verbose_name = 'School Award'
        verbose_name_plural = 'School Awards & Recognitions'

    def __str__(self):
        return f"{self.name} ({self.year})" if self.year else self.name


class SchoolVideo(models.Model):
    """School onboarding wizard step: Video links (YouTube)."""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='video_items')
    title = models.CharField(max_length=200, blank=True, default='Campus Video')
    youtube_url = models.URLField('YouTube URL', max_length=500)
    is_approved = models.BooleanField('Approved', default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'School Video'
        verbose_name_plural = 'School Videos'

    def __str__(self):
        return f"{self.school.name} - {self.title or self.youtube_url}"


class Review(models.Model):
    """Review by a parent / student. It counts towards the school's rating only after approval."""
    ROLES = [('Parent', 'Parent'), ('Student', 'Student'), ('Alumni', 'Alumni'), ('Staff', 'Staff')]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='review_items')
    parent_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviews_written')
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=ROLES, default='Parent')
    mobile = models.CharField(max_length=10, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    text = models.TextField()
    is_approved = models.BooleanField('Approved', default=True)
    school_reply = models.TextField('School Official Reply', blank=True, default='')
    reply_approved = models.BooleanField('Reply Approved', default=True)
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
    SCHOOL_LEAD_STATUS = [
        ('pending', 'Pending (Contact Masked)'),
        ('accepted', 'Accepted (Contact Unlocked)'),
        ('rejected', 'Rejected by School'),
        ('review_requested', 'Review Requested (Invalid Lead)'),
        ('refunded', 'Credit Refunded by Admin'),
    ]
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL, related_name='enquiries')
    parent_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='parent_enquiries')
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
    status = models.CharField('Admin Status', max_length=20, choices=STATUS, default='new')
    adminNote = models.CharField(max_length=1000, blank=True, default='')

    # --- School Panel Lead & Credit Tracking ---
    school_status = models.CharField('School Lead Status', max_length=20, choices=SCHOOL_LEAD_STATUS, default='pending', db_index=True)
    is_unlocked = models.BooleanField('Contact Unlocked by School', default=False)
    unlocked_at = models.DateTimeField(null=True, blank=True)
    credit_used = models.BooleanField('1 Credit Used', default=False)
    lead_source_tag = models.CharField('Lead Type', max_length=50, default='Direct Inquiry')
    school_note = models.CharField('School Follow-up Note', max_length=1000, blank=True, default='')
    rejection_reason = models.CharField('Rejection Reason', max_length=300, blank=True, default='')
    review_reason = models.CharField('Refund / Review Request Reason', max_length=500, blank=True, default='')
    followup_date = models.DateField('Follow-up Date', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Enquiry / School Lead'
        verbose_name_plural = 'Enquiries & School Leads'

    def save(self, *args, **kwargs):
        if not self.school:
            if self.schoolId:
                if self.schoolName:
                    self.school = School.objects.filter(
                        Q(school_id=self.schoolId) | Q(pk=self.schoolId),
                        name__icontains=self.schoolName.strip()[:20]
                    ).first()
                if not self.school:
                    self.school = School.objects.filter(school_id=self.schoolId).first()
                if not self.school:
                    self.school = School.objects.filter(pk=self.schoolId).first()
            if not self.school and self.schoolName:
                if self.city:
                    self.school = School.objects.filter(name__iexact=self.schoolName.strip(), city__iexact=self.city.strip()).first()
                if not self.school:
                    self.school = School.objects.filter(name__iexact=self.schoolName.strip()).first()
        if self.school and not self.schoolId:
            self.schoolId = self.school.school_id or self.school.pk
        if self.school and not self.schoolName:
            self.schoolName = self.school.name
        super().save(*args, **kwargs)

    @property
    def masked_mobile(self):
        m = (self.mobile or '').strip()
        if len(m) >= 10:
            return f"+91 {m[:2]}XXXXXX{m[-2:]}"
        return "+91 XXXXXXXXXX"

    @property
    def masked_email(self):
        e = (self.email or '').strip()
        if '@' in e:
            name, dom = e.split('@', 1)
            return f"{name[:1]}****@{dom}"
        return "hidden@email.com"

    def __str__(self):
        return f'{self.parentName} -> {self.schoolName} ({self.className or "Enquiry"})'


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
                              help_text='Photo of the city / state card on the homepage')
    image_url = models.URLField('Card photo link (URL)', max_length=1000, blank=True, default='')
    show_on_home = models.BooleanField('Show on homepage', default=False,
                                       help_text='Tick to show this in Popular cities / states on the homepage')
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
    """Key highlights shown on the city/state page (editable from the admin)."""
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


CLASS_CHOICES = [('', 'All classes'), ('Nursery', 'Nursery'), ('KG', 'KG'), ('LKG', 'LKG'), ('UKG', 'UKG')] + [(f'Class {n}', f'Class {n}') for n in range(1, 13)]


class FeeComponent(models.Model):
    FREQ = [('One-time', 'One-time'), ('Monthly', 'Monthly'), ('Annually', 'Annually')]
    SESSIONS = [('2027-28', '2027-28'), ('2026-27', '2026-27'), ('2025-26', '2025-26'), ('2024-25', '2024-25')]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='fee_components')
    session = models.CharField(max_length=10, choices=SESSIONS, default='2027-28')
    class_name = models.CharField('Class', max_length=20, choices=CLASS_CHOICES, blank=True, default='', help_text='Leave empty = applies to all classes')
    name = models.CharField('Fee name', max_length=120, help_text='For example: Tuition fee, Admission fee, Transport fee')
    frequency = models.CharField(max_length=10, choices=FREQ, default='Annually')
    amount = models.PositiveIntegerField('Amount (₹)')

    class Meta:
        ordering = ['session', 'class_name', 'id']

    def __str__(self):
        return f'{self.name} - {self.amount}'


# ============================================================================
# NEW MODELS: PARENT PANEL, SCHOOL PANEL, PLANS, MEMBERSHIPS, INVOICES
# ============================================================================

class ParentProfile(models.Model):
    """Logged-in Parent or Student profile and child education preferences."""
    RELATIONS = [('Father', 'Father'), ('Mother', 'Mother'), ('Guardian', 'Guardian'), ('Student', 'Student')]
    SCHOOL_TYPES = [('Day', 'Day School'), ('Boarding School', 'Boarding School'), ('Play School', 'Play School')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile')
    parent_name = models.CharField('Parent / Full Name', max_length=120)
    student_name = models.CharField('Child / Student Name', max_length=120, blank=True, default='')
    mobile = models.CharField('Mobile Number', max_length=10, db_index=True, validators=[mobile_validator])
    mobile_verified = models.BooleanField('Mobile Verified', default=True)
    email = models.EmailField('Email Address', blank=True, default='')
    relation = models.CharField('Relation', max_length=30, choices=RELATIONS, default='Mother')
    looking_for_class = models.CharField('Admission for Class', max_length=40, blank=True, default='')
    current_school = models.CharField('Current School', max_length=200, blank=True, default='')
    admission_type = models.CharField('Admission For (Type)', max_length=30, choices=SCHOOL_TYPES, blank=True, default='Boarding School')
    preferred_city = models.CharField('Preferred City', max_length=120, blank=True, default='')
    preferred_state = models.CharField('Preferred State', max_length=120, blank=True, default='')
    preferred_board = models.CharField('Preferred Board', max_length=40, choices=BOARDS, blank=True, default='CBSE')
    budget = models.CharField('Annual Fee Budget', max_length=80, blank=True, default='₹50,000 - ₹1,50,000')
    session = models.CharField('Target Session', max_length=20, default='2027-28')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Parent / Student Account'
        verbose_name_plural = 'Parent & Student Accounts'

    @property
    def profile_completion(self):
        fields = [
            self.parent_name, self.student_name, self.mobile, self.email,
            self.looking_for_class, self.admission_type, self.preferred_city, self.preferred_board, self.budget
        ]
        filled = sum(1 for f in fields if str(f or '').strip())
        return min(100, round((filled / len(fields)) * 100))

    def __str__(self):
        return f"{self.parent_name} ({self.mobile}) - Child: {self.student_name or 'N/A'}"


class SchoolAccount(models.Model):
    """School Owner / Institution Login Account with 3-stage Admin Approval workflow."""
    STATUS = [
        ('pending', 'Pending Owner Profile Approval'),
        ('approved', 'Owner Profile Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    SCHOOL_LINK_STATUS = [
        ('none', 'No School Selected Yet'),
        ('pending_claim', 'Pending Existing School Claim Approval'),
        ('pending_new', 'Pending New School Addition Approval'),
        ('approved', 'School Linked & Approved'),
        ('rejected', 'School Claim / Addition Rejected'),
    ]
    EDIT_APPROVAL_STATUS = [
        ('none', 'No Pending Profile Edits'),
        ('pending', 'Profile Edits Pending Admin Approval'),
        ('approved', 'Profile Edits Approved & Live'),
        ('rejected', 'Profile Edits Rejected'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='school_account')
    owner_record = models.ForeignKey(
        Owner, null=True, blank=True, on_delete=models.SET_NULL, related_name='portal_accounts',
        help_text='Linked School Owner profile record.'
    )
    school = models.ForeignKey(
        School, null=True, blank=True, on_delete=models.SET_NULL, related_name='school_accounts',
        help_text='Approved live school linked to this owner.'
    )
    requested_school = models.ForeignKey(
        School, null=True, blank=True, on_delete=models.SET_NULL, related_name='claim_requests',
        help_text='Existing school requested for claim (pending admin approval).'
    )
    school_link_status = models.CharField(
        'School Claim / Addition Status', max_length=20, choices=SCHOOL_LINK_STATUS, default='none', db_index=True
    )
    pending_new_school_data = models.JSONField('Pending New School Submission', default=dict, blank=True)

    edit_approval_status = models.CharField(
        'Profile Edits Approval Status', max_length=20, choices=EDIT_APPROVAL_STATUS, default='none', db_index=True
    )
    pending_edit_data = models.JSONField('Pending School Profile Edits (Draft)', default=dict, blank=True)
    edit_submitted_at = models.DateTimeField('Edits Submitted At', null=True, blank=True)
    edit_rejection_reason = models.CharField('Edit Rejection Note', max_length=300, blank=True, default='')

    institution_name = models.CharField('Institution / Organization Name', max_length=240, blank=True, default='')
    contact_person = models.CharField('Owner / Contact Person Name', max_length=120)
    designation = models.CharField('Designation', max_length=80, blank=True, default='Founder / Principal')
    mobile = models.CharField('Official Mobile', max_length=10, db_index=True, validators=[mobile_validator])
    mobile_verified = models.BooleanField('Email / Mobile Verified', default=True)
    email = models.EmailField('Official Email')
    city = models.CharField(max_length=120, blank=True, default='')
    state = models.CharField(max_length=120, blank=True, default='')
    address = models.CharField(max_length=400, blank=True, default='')
    claim_proof = models.CharField(
        'Affiliation No. / Verification Proof', max_length=300, blank=True, default='',
        help_text='CBSE/ICSE Affiliation number, official email domain, or verification document note.'
    )
    status = models.CharField('Owner Profile Status', max_length=20, choices=STATUS, default='pending', db_index=True)
    rejection_reason = models.CharField('Rejection / Suspension Reason', max_length=300, blank=True, default='')
    wizard_step = models.PositiveSmallIntegerField('Onboarding Step (1-10)', default=1)
    brochure_url = models.URLField('Brochure PDF / Doc URL', max_length=1000, blank=True, default='')
    brochure_file = models.FileField('Brochure File (PDF/DOC)', upload_to='schools/brochures/', blank=True)
    logo_file = models.ImageField('School Logo (256x170)', upload_to='schools/logos/', blank=True)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_school_accounts')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'School Owner & Institution'
        verbose_name_plural = 'School Owners & Institutions'

    def sync_owner_record(self):
        """Keeps the `Owner` table synchronized with this `SchoolAccount` so Admin sees everything in both places."""
        owner_status = 'approved' if self.status == 'approved' else ('rejected' if self.status == 'rejected' else 'pending')
        if self.owner_record_id:
            Owner.objects.filter(pk=self.owner_record_id).update(
                name=self.contact_person or self.institution_name,
                designation=self.designation,
                phone=self.mobile,
                email=self.email,
                city=self.city,
                state=self.state,
                approval_status=owner_status,
            )
        else:
            ow = Owner.objects.create(
                name=self.contact_person or self.institution_name or 'School Owner',
                designation=self.designation,
                phone=self.mobile,
                email=self.email,
                city=self.city,
                state=self.state,
                approval_status=owner_status,
            )
            SchoolAccount.objects.filter(pk=self.pk).update(owner_record=ow)
            self.owner_record = ow
        if self.school_id and self.owner_record_id:
            School.objects.filter(pk=self.school_id).update(owner_id=self.owner_record_id)

    def save(self, *args, **kwargs):
        if not self.school_id and self.requested_school_id and self.school_link_status == 'approved':
            self.school = self.requested_school
            if not self.institution_name:
                self.institution_name = self.requested_school.name
        if self.school_id and self.school_link_status == 'none':
            self.school_link_status = 'approved'
        super().save(*args, **kwargs)
        self.sync_owner_record()

    @property
    def profile_completion(self):
        s = self.school
        draft = self.pending_edit_data or {}
        if not s and not draft:
            return 25 if self.status == 'approved' else 15
        checks = [
            bool(draft.get('name') or (s and s.name and s.city and s.board)),
            bool(draft.get('phone') or (s and (s.phone or s.landline)) or self.mobile),
            bool((draft.get('about') and len(str(draft.get('about'))) >= 30) or (s and s.about and len(s.about) >= 30)),
            bool(draft.get('facilities') or (s and s.facilities)),
            bool(draft.get('feeMin') or draft.get('feeComponents') or (s and (s.feeMin or s.fee or s.fee_components.exists()))),
            bool(draft.get('awards') or (s and s.award_items.exists())),
            bool(draft.get('videos') or draft.get('youtubeUrl') or (s and (s.video_items.exists() or s.youtube_url))),
            bool(draft.get('photos') or draft.get('image') or (s and (s.cover_image or s.image or s.photo_items.exists()))),
            bool(draft.get('logoUrl') or draft.get('brochureUrl') or (s and s.logo_url) or self.logo_file or self.brochure_url or self.brochure_file),
            bool(draft.get('affiliationNo') or draft.get('established') or (s and (s.affiliation_no or s.established))),
        ]
        return min(100, int(round((sum(1 for c in checks if c) / len(checks)) * 100)))

    def active_memberships(self):
        if not self.school:
            return SchoolMembership.objects.none()
        today = timezone.localdate()
        return self.school.memberships.filter(status='active', end_date__gte=today).order_by('end_date', 'id')

    def total_leads_remaining(self):
        total = 0
        for m in self.active_memberships():
            rem = max(0, m.leads_total - m.leads_used)
            total += rem
        return total

    def total_leads_quota(self):
        return sum(m.leads_total for m in self.active_memberships())

    def total_leads_used(self):
        return sum(m.leads_used for m in self.active_memberships())

    def __str__(self):
        school_label = self.school.name if self.school else (self.institution_name or 'No School Yet')
        return f"{self.contact_person} - {school_label} ({self.get_status_display()})"


class Plan(models.Model):
    """Subscription Plans (1-Year Featured/Recommended/TopRated + 100 Leads) and Lead Top-up Packs (+50/+100 Leads)."""
    PLAN_TYPES = [
        ('yearly', 'Yearly Membership Plan (Validity + Leads + Badges)'),
        ('topup', 'Lead Booster / Data Top-up Pack (Extra Leads)'),
        ('pay_per_admission', 'Pay Per Admission Plan'),
        ('free', 'Free / Trial Listing Plan'),
    ]
    name = models.CharField('Plan Name', max_length=140)
    code = models.SlugField('Plan Code', max_length=60, unique=True)
    plan_type = models.CharField('Plan Type', max_length=30, choices=PLAN_TYPES, default='yearly')
    price = models.PositiveIntegerField('Base Price before GST (₹)', default=9999)
    gst_percent = models.PositiveSmallIntegerField('GST (%)', default=18)
    validity_days = models.PositiveIntegerField('Validity (Days)', default=365, help_text='365 = 1 Year')
    leads_included = models.PositiveIntegerField('Lead Credits Included', default=100, help_text='Example: 100 leads')

    # Badges & Visibility granted on subscribing
    grants_featured = models.BooleanField('Featured School Badge (Homepage)', default=False)
    grants_recommended = models.BooleanField('Recommended School Badge (Homepage)', default=False)
    grants_top_rated = models.BooleanField('Top Rated School Badge', default=False)
    grants_verified = models.BooleanField('Verified Institution Badge', default=True)

    description = models.CharField(max_length=300, blank=True, default='')
    features = models.JSONField(
        'Plan Features (List)', default=list, blank=True,
        help_text='Example: ["100 Verified Parent Leads", "1 Year Validity", "Featured on Homepage", "Dedicated Support"]'
    )
    is_popular = models.BooleanField('Highlight as Most Popular', default=False)
    is_active = models.BooleanField('Active (Shown to Schools)', default=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'price', 'id']
        verbose_name = 'Membership Plan / Lead Top-up'
        verbose_name_plural = 'Membership Plans & Lead Top-ups'

    @property
    def gst_amount(self):
        return round((self.price * self.gst_percent) / 100)

    @property
    def total_price_with_gst(self):
        return self.price + self.gst_amount

    def __str__(self):
        return f"{self.name} — ₹{self.price:,} + {self.gst_percent}% GST ({self.leads_included} Leads, {self.validity_days} Days)"


class Coupon(models.Model):
    DISCOUNT_TYPES = [('flat', 'Flat Discount (₹)'), ('percent', 'Percentage Discount (%)')]
    code = models.CharField('Coupon Code', max_length=40, unique=True)
    discount_type = models.CharField(max_length=15, choices=DISCOUNT_TYPES, default='percent')
    discount_value = models.PositiveIntegerField('Discount Value', default=10)
    expiry_date = models.DateField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(default=100)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.code = (self.code or '').strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        val = f"₹{self.discount_value}" if self.discount_type == 'flat' else f"{self.discount_value}%"
        return f"{self.code} ({val} OFF)"


class SchoolMembership(models.Model):
    """Assigned / Subscribed Plan or Lead Top-up Recharge for a School."""
    STATUS = [
        ('active', 'Active'),
        ('exhausted', 'Lead Credits Exhausted (0 Left)'),
        ('expired', 'Validity Expired'),
        ('cancelled', 'Cancelled'),
    ]
    PAYMENT_MODES = [
        ('upi', 'UPI / QR Transfer'),
        ('bank', 'Bank Transfer (NEFT / RTGS / IMPS)'),
        ('card', 'Credit / Debit Card'),
        ('cash', 'Cash'),
        ('cheque', 'Cheque / DD'),
        ('online', 'Online Payment Gateway'),
        ('free', 'Free / Complimentary Trial'),
    ]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='memberships')
    plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL, related_name='memberships')
    plan_name = models.CharField('Plan / Pack Name', max_length=140, blank=True, default='')
    plan_type = models.CharField(max_length=30, default='yearly')
    start_date = models.DateField('Start Date', default=timezone.localdate)
    end_date = models.DateField('Expiry / Renewal Date', null=True, blank=True)
    leads_total = models.PositiveIntegerField('Total Lead Credits', default=100)
    leads_used = models.PositiveIntegerField('Leads Used / Unlocked', default=0)

    amount = models.PositiveIntegerField('Subtotal Amount (₹)', default=0)
    discount = models.PositiveIntegerField('Discount (₹)', default=0)
    gst_percent = models.PositiveSmallIntegerField('GST (%)', default=18)
    gst_amount = models.PositiveIntegerField('GST Amount (₹)', default=0)
    total_paid = models.PositiveIntegerField('Total Paid incl. GST (₹)', default=0)

    payment_mode = models.CharField('Payment Mode', max_length=20, choices=PAYMENT_MODES, default='upi')
    payment_note = models.CharField('Transaction Ref / Payment Note', max_length=300, blank=True, default='')
    coupon_code = models.CharField(max_length=40, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS, default='active', db_index=True)
    assigned_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_memberships')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'School Membership / Lead Recharge'
        verbose_name_plural = 'School Memberships & Lead Recharges'

    @property
    def leads_remaining(self):
        return max(0, self.leads_total - self.leads_used)

    @property
    def days_remaining(self):
        if not self.end_date:
            return 0
        delta = (self.end_date - timezone.localdate()).days
        return max(0, delta)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if self.plan:
            if not self.plan_name:
                self.plan_name = self.plan.name
            self.plan_type = self.plan.plan_type
            if is_new and self.leads_total == 100 and self.plan.leads_included != 100:
                self.leads_total = self.plan.leads_included
            if is_new and self.amount == 0 and self.plan.price > 0:
                self.amount = self.plan.price
            self.gst_percent = self.plan.gst_percent
            if not self.end_date:
                self.end_date = (self.start_date or timezone.localdate()) + timedelta(days=self.plan.validity_days or 365)
        if not self.end_date:
            self.end_date = (self.start_date or timezone.localdate()) + timedelta(days=365)
        if not self.plan_name:
            self.plan_name = 'Custom Lead Plan'

        taxable = max(0, (self.amount or 0) - (self.discount or 0))
        self.gst_amount = round((taxable * (self.gst_percent or 0)) / 100)
        self.total_paid = taxable + self.gst_amount

        if self.leads_used >= self.leads_total and self.leads_total > 0 and self.status == 'active':
            self.status = 'exhausted'

        super().save(*args, **kwargs)

        # Grant homepage / listing badges from plan to the School automatically
        if self.school and self.plan and self.status == 'active':
            updates = {}
            if self.plan.grants_featured:
                updates['isFeatured'] = True
            if self.plan.grants_recommended:
                updates['isRecommended'] = True
            if self.plan.grants_top_rated:
                updates['topRated'] = True
            if self.plan.grants_verified:
                updates['verified'] = True
            if updates:
                School.objects.filter(pk=self.school.pk).update(**updates)

        # Automatically generate GST Invoice if not created yet
        if not hasattr(self, 'invoice'):
            year = timezone.localdate().year
            count = Invoice.objects.filter(invoice_number__startswith=f'INV-{year}-').count() + 1
            inv_no = f'INV-{year}-{count:06d}'
            while Invoice.objects.filter(invoice_number=inv_no).exists():
                count += 1
                inv_no = f'INV-{year}-{count:06d}'
            Invoice.objects.create(
                invoice_number=inv_no,
                membership=self,
                school=self.school,
                recipient_name=self.school.name,
                recipient_address=', '.join(x for x in (self.school.address, self.school.city, self.school.state) if x),
                plan_description=f"{self.plan_name} ({self.leads_total} Leads · Valid till {self.end_date})",
                subtotal=self.amount,
                discount=self.discount,
                gst_percent=self.gst_percent,
                gst_amount=self.gst_amount,
                total_amount=self.total_paid,
                payment_mode=self.get_payment_mode_display(),
                status='paid',
            )

    def __str__(self):
        return f"{self.school.name} — {self.plan_name} ({self.leads_remaining}/{self.leads_total} leads left)"


class Invoice(models.Model):
    """Immutable GST Invoice generated when a Plan or Top-up is assigned/purchased."""
    STATUS = [('paid', 'Paid'), ('cancelled', 'Cancelled / Credit Note')]
    invoice_number = models.CharField('Invoice No.', max_length=40, unique=True)
    membership = models.OneToOneField(SchoolMembership, on_delete=models.CASCADE, related_name='invoice')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='invoices')
    recipient_name = models.CharField(max_length=240)
    recipient_address = models.CharField(max_length=500, blank=True, default='')
    recipient_gstin = models.CharField('School GSTIN', max_length=30, blank=True, default='')
    plan_description = models.CharField(max_length=300)
    subtotal = models.PositiveIntegerField('Price before Tax (₹)', default=0)
    discount = models.PositiveIntegerField('Discount (₹)', default=0)
    gst_percent = models.PositiveSmallIntegerField('GST (%)', default=18)
    gst_amount = models.PositiveIntegerField('GST Amount (₹)', default=0)
    total_amount = models.PositiveIntegerField('Total Paid (₹)', default=0)
    payment_mode = models.CharField(max_length=60, default='UPI')
    status = models.CharField(max_length=20, choices=STATUS, default='paid')
    issued_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'GST Invoice'
        verbose_name_plural = 'GST Invoices'

    def __str__(self):
        return f"{self.invoice_number} — {self.recipient_name} (₹{self.total_amount:,})"


class Shortlist(models.Model):
    """Parent's shortlisted schools."""
    parent_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shortlisted_schools')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='shortlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['parent_user', 'school'], name='unique_parent_school_shortlist')]
        verbose_name = 'Shortlisted School'
        verbose_name_plural = 'Shortlisted Schools'

    def __str__(self):
        return f"{self.parent_user.username} - {self.school.name}"


class LeadMessage(models.Model):
    """Admission & Chat thread between Parent and School on an Enquiry."""
    ROLES = [('parent', 'Parent'), ('school', 'School'), ('admin', 'VidyaVista Support')]
    enquiry = models.ForeignKey(Enquiry, on_delete=models.CASCADE, related_name='messages')
    sender_role = models.CharField(max_length=20, choices=ROLES)
    sender_name = models.CharField(max_length=120)
    message = models.TextField(max_length=1500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Admission Chat Message'
        verbose_name_plural = 'Admission Chat Messages'

    def __str__(self):
        return f"{self.sender_name} ({self.sender_role}): {self.message[:50]}"


class EmailOTP(models.Model):
    """6-digit Email Verification OTP for School Owner and Parent Registration."""
    PURPOSES = [
        ('school_register', 'School Owner Registration'),
        ('parent_register', 'Parent / Student Registration'),
    ]
    email = models.EmailField('Email Address', db_index=True)
    otp_code = models.CharField('6-Digit OTP', max_length=6)
    purpose = models.CharField('Purpose', max_length=30, choices=PURPOSES, default='parent_register')
    is_verified = models.BooleanField('Verified', default=False)
    expires_at = models.DateTimeField('Expires At')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Email Verification OTP'
        verbose_name_plural = 'Email Verification OTPs'

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.email} - {self.otp_code} ({'Verified' if self.is_verified else 'Pending'})"


class BranchClaim(models.Model):
    STATUS = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    account = models.ForeignKey(SchoolAccount, on_delete=models.CASCADE, related_name='branch_claims')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='branch_claims')
    proof = models.CharField('Affiliation / Ownership Verification', max_length=300, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Branch Claim Request'
        verbose_name_plural = 'Branch Claim Requests'

    def __str__(self):
        return f"{self.school.name} - {self.account.contact_person} ({self.status})"
