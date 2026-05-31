import urllib.request
import re

url = 'https://www.imdb.com/title/tt0816692/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        matches = re.findall(r'playbackURLs":\[(.*?)\]', html)
        if matches:
            print('Found playback URLs!')
            print(matches[0][:500])
        else:
            print('No playback URLs found.')
            video_ids = set(re.findall(r'vi\d+', html))
            print('Found video IDs:', list(video_ids)[:10])
except Exception as e:
    print(e)
