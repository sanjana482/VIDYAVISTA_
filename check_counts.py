import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from collections import Counter, defaultdict
from schools.models import School

qs = list(School.objects.all().only("name", "city", "state", "type", "isActive"))
print("TOTAL schools:", len(qs), "| active:", sum(1 for s in qs if s.isActive))

by = defaultdict(Counter)
for s in qs:
    st = (s.state or "(empty)").strip()
    by[st]["total"] += 1
    by[st]["active" if s.isActive else "inactive"] += 1
    by[st]["type:" + (s.type or "?")] += 1

print("\n--- state wise ---")
for st in sorted(by):
    print(st, dict(by[st]))

dup = Counter((s.name.strip().lower(), s.city.strip().lower()) for s in qs)
d = [(k, v) for k, v in dup.items() if v > 1]
print("\nduplicates (same name + city):", len(d))
for k, v in d[:30]:
    print(" ", v, "x", k)

print("\nstate spellings:", sorted({(s.state or "") for s in qs}))