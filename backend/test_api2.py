import urllib.request
import urllib.parse
import ssl

url = 'http://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2/getDetailInfoSearchV2'
key = 'tBdqhyfihj/1AQ75yRkNeA+/q97CpdfKHlcd4+AKRg/+9g9BzfMDqVc4mTHHnskQD2pBNP3iX/YB/ktYf73Y+A=='
queryParams = '?serviceKey=' + urllib.parse.quote(key) + '&wkplNm=' + urllib.parse.quote('우아한형제들') + '&pageNo=1&numOfRows=10'

request = urllib.request.Request(url + queryParams)
context = ssl._create_unverified_context()
response = urllib.request.urlopen(request, context=context)
response_body = response.read()
print(response_body.decode('utf-8'))
