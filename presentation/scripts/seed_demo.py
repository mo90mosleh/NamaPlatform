import json, sqlite3, uuid
from pathlib import Path
def uid(key): return str(uuid.uuid5(uuid.NAMESPACE_URL,'namaplatform-demo/'+key))
org=uid('org')
d=dict(organization=dict(id=org,name='پارس تجهیز آریا',display_name='پارس تجهیز آریا',primary_color='#116a65',logo_data_url=None),user=dict(name='مشاهده‌گر دمو',email='',role='VIEWER'))
for k in 'units positions persons assignments nodes profiles kpis links documents references relations requirements kpiOrgLinks'.split(): d[k]=[]
units=['مدیریت عامل','فروش','برنامه‌ریزی تولید','تدارکات','تولید','کنترل کیفیت','انبار و لجستیک','خدمات مشتری','مالی','منابع انسانی']
for i,name in enumerate(units):
 u=uid(f'u{i}'); p=uid(f'p{i}'); person=uid(f'person{i}')
 d['units'].append(dict(id=u,name=name,code=f'U{i:02}',sort_order=i,parent_id=uid('u0') if i else None,organization_id=org))
 d['positions'].append(dict(id=p,title='مدیر عامل' if not i else 'مسئول '+name,org_unit_id=u,reports_to_position_id=uid('p0') if i else None))
 d['persons'].append(dict(id=person,display_name=['آرمان نیک‌روش','نیلوفر شکیبا','سپهر روشن','بهار فلاح','کاوه امید','آوا صالح','سام راد','ترانه مهر','مانی آزاد','مینا بهروش'][i]))
 d['assignments'].append(dict(id=uid(f'a{i}'),person_id=person,position_id=p))
groups=[('CORE','عملیات اصلی'),('MANAGEMENT','راهبری'),('SUPPORT','پشتیبانی')]
for key,name in groups:d['nodes'].append(dict(id=uid(key),name=name,code=key,kind='GROUP',classification=key,parent_id=None))
rows=[
(1,'ثبت و تأیید سفارش','سفارش مشتری','سفارش تأییدشده','زمان تأیید سفارش','ساعت',24,12,16,'مجموع ساعت بین دریافت و تأیید سفارش ÷ تعداد سفارش‌های تأییدشده'),
(2,'برنامه‌ریزی تولید','سفارش تأییدشده','برنامه تولید مصوب','تحقق برنامه تولید','درصد',78,95,88,'تعداد دستورهای تولید تکمیل‌شده طبق برنامه ÷ دستورهای برنامه‌ریزی‌شده × ۱۰۰'),
(3,'تأمین مواد اولیه','برنامه تولید مصوب','مواد آماده مصرف','تحویل به‌موقع تأمین‌کننده','درصد',83,96,92,'خطوط خرید تحویل‌شده در موعد ÷ کل خطوط خرید سررسیدشده × ۱۰۰'),
(4,'مونتاژ تجهیزات','مواد آماده مصرف','محصول مونتاژشده','زمان چرخه مونتاژ','دقیقه',64,45,51,'مجموع زمان مونتاژ ÷ تعداد محصول مونتاژشده'),
(5,'بازرسی و آزادسازی محصول','محصول مونتاژشده','محصول آزادشده','قبولی در آزمون اول','درصد',91,98,96,'تعداد محصولات قبول در بازرسی اول ÷ تعداد محصولات بازرسی‌شده × ۱۰۰'),
(6,'ارسال و تحویل سفارش','محصول آزادشده','تحویل به مشتری','تحویل کامل و به‌موقع','درصد',82,96,91,'تعداد سفارش‌های کامل و به‌موقع ÷ تعداد سفارش‌های سررسیدشده × ۱۰۰'),
(7,'رسیدگی به خدمات پس از فروش','تحویل به مشتری / درخواست خدمات','درخواست بسته‌شده','زمان حل درخواست خدمات','روز',5,2,3,'مجموع روز تا حل درخواست ÷ تعداد درخواست‌های حل‌شده'),
(8,'صدور و وصول فاکتور','رسید تحویل','تسویه فاکتور','وصول به‌موقع فاکتور','درصد',73,90,84,'مبلغ سررسیدشده وصول‌شده در موعد ÷ کل مبلغ سررسیدشده × ۱۰۰'),
(9,'آموزش اپراتورهای تولید','نیاز مهارتی ثبت‌شده','تأیید صلاحیت اپراتور','پوشش آموزش ایستگاه‌ها','درصد',70,95,85,'اپراتورهای دارای صلاحیت معتبر ÷ اپراتورهای مشمول آموزش × ۱۰۰'),
(0,'بازنگری عملکرد سازمان','گزارش شاخص‌های واحدها','تصمیم‌ها و اقدامات اصلاحی','اجرای اقدامات اصلاحی در موعد','درصد',68,90,80,'اقدامات بسته‌شده در موعد ÷ اقدامات سررسیدشده × ۱۰۰')]
cycles=[dict(id='1405-fall',title='پاییز ۱۴۰۵',status='ACTIVE',startDate='2026-09-23',endDate='2026-12-21')]
okr=dict(cycles=cycles,objectives=[],keyResults=[],checkins=[])
objectives=[('تحویل سفارش به مشتری را قابل پیش‌بینی کنیم',0,'تجربه مشتری'),('جریان تولید را پایدار و کم‌اتلاف کنیم',4,'عملیات'),('از سفارش تا تحویل، مشتری را در جریان نگه داریم',1,'تجربه مشتری')]
for i,(title,owner,pillar) in enumerate(objectives):
 okr['objectives'].append(dict(id=uid(f'o{i}'),code=f'O-{i+1:02}',title=title,description='هدف نمونه برای دوره پاییز ۱۴۰۵',cycleId=cycles[0]['id'],parentId=uid('o0') if i else None,level='DEPARTMENT' if i else 'COMPANY',ownerUnitId=uid(f'u{owner}'),pillar=pillar,confidence='ON_TRACK'))
for i,(owner,name,inp,out,kpi,unit,base,target,current,formula) in enumerate(rows):
 node=uid(f'n{i}'); ki=uid(f'k{i}'); u=uid(f'u{owner}')
 g='CORE' if i<7 else 'SUPPORT' if i<9 else 'MANAGEMENT'
 d['nodes'].append(dict(id=node,code=f'P-{i+1:02}',name=name,kind='PROCESS',classification=g,parent_id=uid(g),owner_org_unit_id=u,summary=f'از {inp} تا {out}'))
 d['profiles'].append(dict(id=uid(f'pr{i}'),process_id=node,objective=f'اطمینان از ثبت و تحویل {out}',start_event=inp,end_event=out,inputs=inp,outputs=out,roles=units[owner],expected_outcome=out,notes='سناریوی ساختگی برای ارائه نما'))
 d['kpis'].append(dict(id=ki,code=f'K-{i+1:02}',name=kpi,unit=unit,preferred_direction='HIGHER' if target>base else 'LOWER',frequency='ماهانه',target_value=target,owner_person_id=uid(f'person{owner}'),formula_text=formula,readiness_status='READY',data_source='ثبت عملیات '+units[owner]))
 d['links'].append(dict(process_id=node,kpi_id=ki));d['kpiOrgLinks'].append(dict(kpi_id=ki,org_unit_id=u,position_id=None))
 if i<6:d['relations'].append(dict(id=uid(f'r{i}'),source_process_id=node,target_process_id=uid(f'n{i+1}'),relation_type='OUTPUT_TO',note=out))
 if i in [0,1,3,4,5,6]:
  obj=uid('o'+str(0 if i==5 else 1 if i in [1,3,4] else 2));kr=uid(f'kr{i}')
  okr['keyResults'].append(dict(id=kr,objectiveId=obj,title=kpi,baseline=base,target=target,current=current,unit=unit,kpiId=ki,weight=1))
  okr['checkins'].append(dict(id=uid(f'ci{i}'),keyResultId=kr,objectiveId=obj,previous=base,value=current,confidence='ON_TRACK',note='اندازه‌گیری آزمایشی آبان',createdAt='2026-11-12T09:00:00Z'))
d['okr']=okr
root=Path(__file__).resolve().parents[1]/'data'
with sqlite3.connect(root/'nama-demo.sqlite3') as db:
 db.execute('CREATE TABLE IF NOT EXISTS demo_snapshot (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL CHECK(json_valid(data)))')
 db.execute('INSERT OR REPLACE INTO demo_snapshot VALUES(1,?)',(json.dumps(d,ensure_ascii=False),))
 snapshot=json.loads(db.execute('SELECT data FROM demo_snapshot').fetchone()[0])
(root/'nama-demo.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
(root/'nama-okr.json').write_text(json.dumps(snapshot['okr'],ensure_ascii=False,indent=2)+'\n')
