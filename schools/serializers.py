from rest_framework import serializers
from .models import School, Enquiry, LocationPage
class SchoolSerializer(serializers.ModelSerializer):
    schoolId=serializers.IntegerField(source='school_id', read_only=True)
    class Meta: model=School; fields='__all__'
    def to_representation(self, obj):
        data=super().to_representation(obj)
        comps=list(obj.fee_components.all())
        if comps:
            groups={}
            for c in comps:
                groups.setdefault((c.session,c.class_name or 'All classes'),[]).append({'label':c.name,'freq':c.frequency,'amount':c.amount})
            data['feeSlabs']=[{'session':s,'cls':cl,'rows':rows} for (s,cl),rows in groups.items()]
        return data
class EnquirySerializer(serializers.ModelSerializer):
    class Meta: model=Enquiry; fields='__all__'; read_only_fields=('status','adminNote','created_at','updated_at')
    def validate_mobile(self,value):
        if not (len(value)==10 and value.isdigit() and value[0] in '6789'):
            raise serializers.ValidationError('Enter a valid 10-digit Indian mobile number.')
        return value
class LocationSerializer(serializers.ModelSerializer):
    class Meta: model=LocationPage; fields='__all__'
