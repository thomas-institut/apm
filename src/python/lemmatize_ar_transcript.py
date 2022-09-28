import json
import requests
url = 'https://farasa.qcri.org/webapi/lemmatization/'
text = 'يُشار إلى أن اللغة العربية'
api_key = "iNrmaSCDkLGEGDKwxP"
payload = {'text': text, 'api_key': api_key}
data = requests.post(url, data=payload)
result = json.loads(data.text)
print(result)