import urllib.request
import json
import ssl

key = '1395f723b0df9de2eff4799ee0d091ba4550efad'
corp_code = '01559284'

url_company = f'https://opendart.fss.or.kr/api/company.json?crtfc_key={key}&corp_code={corp_code}'
req = urllib.request.Request(url_company)
ctx = ssl._create_unverified_context()
res = urllib.request.urlopen(req, context=ctx)
print("COMPANY:")
print(json.loads(res.read().decode('utf-8')))

url_emp = f'https://opendart.fss.or.kr/api/empSttus.json?crtfc_key={key}&corp_code={corp_code}&bsns_year=2023&reprt_code=11011'
req2 = urllib.request.Request(url_emp)
res2 = urllib.request.urlopen(req2, context=ctx)
print("\nEMP_STTUS:")
print(json.loads(res2.read().decode('utf-8')))
