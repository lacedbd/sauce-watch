import urllib.request
import json

url = 'https://api.cobalt.tools/api/json'
data = json.dumps({
    'url': 'https://www.youtube.com/watch?v=j7jPnwVGdZ8'
}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers={
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(json.dumps(result, indent=2))
except Exception as e:
    print(e)
