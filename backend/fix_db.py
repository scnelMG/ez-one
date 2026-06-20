import urllib.request
import json
import ssl
import subprocess

key = '1395f723b0df9de2eff4799ee0d091ba4550efad'

# Fix 당근 (01552087)
corp_code = '01552087'
url_company = f'https://opendart.fss.or.kr/api/company.json?crtfc_key={key}&corp_code={corp_code}'
req = urllib.request.Request(url_company)
ctx = ssl._create_unverified_context()
res = urllib.request.urlopen(req, context=ctx)
c_data = json.loads(res.read().decode('utf-8'))
est_dt = c_data.get('est_dt', '')
hm_url = c_data.get('hm_url', '')

# update db
if est_dt and hm_url:
    sql = f"UPDATE company_profiles SET founded_at = '{est_dt}', homepage_url = '{hm_url}' WHERE company_id IN (SELECT company_id FROM jobs j JOIN basket_jobs bj ON j.id = bj.job_id JOIN workspaces w ON bj.id = w.basket_job_id WHERE w.id=5);"
    subprocess.run(['mysql', '-u', 'ezone_dev', '-pEzOne2026Collab7491', 'ez_one', '-e', sql])

# Fix 그루빅건설 (01559284)
corp_code2 = '01559284'
url_company2 = f'https://opendart.fss.or.kr/api/company.json?crtfc_key={key}&corp_code={corp_code2}'
req2 = urllib.request.Request(url_company2)
res2 = urllib.request.urlopen(req2, context=ctx)
c_data2 = json.loads(res2.read().decode('utf-8'))
est_dt2 = c_data2.get('est_dt', '')

if est_dt2:
    sql2 = f"UPDATE company_profiles SET founded_at = '{est_dt2}' WHERE company_id IN (SELECT company_id FROM jobs j JOIN basket_jobs bj ON j.id = bj.job_id JOIN workspaces w ON bj.id = w.basket_job_id WHERE w.id=6);"
    subprocess.run(['mysql', '-u', 'ezone_dev', '-pEzOne2026Collab7491', 'ez_one', '-e', sql2])

print("DB Fixed")
