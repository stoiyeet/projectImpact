import requests
from bs4 import BeautifulSoup
import json

headers = {
    "User-Agent": "AsteroidDataCollector/1.0 (contact: markisaackogan@gmail.com)"
}

def get_asteroid_data(title):
    url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
    html = requests.get(url, headers=headers).text
    soup = BeautifulSoup(html, "html.parser")

    info = {"name": title, "url": url}
    infobox = soup.find("table", {"class": "infobox"})
    if not infobox:
        return info

    for row in infobox.find_all("tr"):
        header = row.find("th")
        data = row.find("td")
        if header and data:
            key = header.text.strip()
            val = data.text.strip()
            if any(k in key for k in ["Dimensions", "Mass", "Mean density"]):
                info[key] = val
    return info

asteroids = [
    "243 Ida",
    "25143 Itokawa",
    "11351 Leucus",
    "21 Lutetia",
    "Menoetius",
    "21900 Orus",
    "617 Patroclus",
    "15094 Polymele",
    "162173 Ryugu",
    "73P/Schwassmann–Wachmann",
    "9P/Tempel 1",
    "4 Vesta",
    "81P/Wild"
]


results = [get_asteroid_data(a) for a in asteroids]

print(json.dumps(results, indent=2, ensure_ascii=False))