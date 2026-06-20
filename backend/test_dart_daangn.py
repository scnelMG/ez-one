import urllib.request
import json
import ssl

key = '1395f723b0df9de2eff4799ee0d091ba4550efad'
corp_code = '01428230' # 당근마켓

url_company = f'https://opendart.fss.or.kr/api/company.json?crtfc_key={key}&corp_code={corp_code}'
req = urllib.request.Request(url_company)
ctx = ssl._create_unverified_context()
res = urllib.request.urlopen(req, context=ctx)
print("COMPANY:")
print(json.loads(res.read().decode('utf-8')))
