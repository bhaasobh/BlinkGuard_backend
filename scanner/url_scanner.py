import requests
import json
import re
from urllib.parse import urlparse
import ipaddress
import Levenshtein
import time
import os
import base64
import requests

TRUSTED_DOMAINS = [
    "google.com",
    "gmail.com",
    "youtube.com",
    "github.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "paypal.com"
]

GSB_API_KEY = os.getenv("GSB_API_KEY")
VT_API_KEY = os.getenv("VT_API_KEY")

COMMON_BRANDS = [
    "google", "paypal", "amazon", "facebook", "apple", "microsoft"
]

SUSPICIOUS_TLDS = [
    "xyz", "info", "top", "club", "online", "site"
]

URL_SHORTENERS = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly"
]

def expand_url(url):
    try:
        response = requests.head(
            url,
            allow_redirects=True,
            timeout=5
        )

        return response.url

    except Exception:
        return url
    
def similar_to_brand(domain: str):
    for brand in COMMON_BRANDS:
        distance = Levenshtein.distance(domain.split(".")[0], brand)
        if distance == 1:
            return True
    return False

def is_ip_address(domain: str):
    try:
        ipaddress.ip_address(domain)
        return True
    except:
        return False

def unusual_domain_structure(domain: str) -> bool:
    parts = domain.split(".")
    return len(parts) > 5 or "-" in domain
 
def unusual_domain_structure(domain):
    if domain.endswith(".ac.il"):
        return False

    parts = domain.split(".")
    return len(parts) > 5 or "-" in domain
def suspicious_tld(domain: str) -> bool:
    return domain.split(".")[-1] in SUSPICIOUS_TLDS


def lacks_https(url: str) -> bool:
    parsed = urlparse(url)

    if parsed.scheme == "":
        return False

    return parsed.scheme == "http"


def overly_complex_path(url):
    parsed = urlparse(url)
    long_params = len(parsed.query) > 100
    many_params = parsed.query.count("&") > 5
    return long_params or many_params


def is_shortened_url(domain: str) -> bool:
    return domain in URL_SHORTENERS

def suspicious_subdomain(domain: str):
    parts = domain.split(".")
    return len(parts) > 4

def looks_random_string(s: str) -> bool:
    """
    Flags random or auto-generated domain labels.
    Rules:
    - contains digits
    - vowel ratio is low
    """
    letters = [c for c in s.lower() if c.isalpha()]
    if not letters:
        return False

    vowel_count = sum(1 for c in letters if c in "aeiou")
    vowel_ratio = vowel_count / len(letters)

    has_digit = any(c.isdigit() for c in s)

    return has_digit and vowel_ratio < 0.4

def is_trusted_domain(domain):
    return any(
        domain == trusted or domain.endswith("." + trusted)
        for trusted in TRUSTED_DOMAINS
    )
def heuristic_analysis(url: str, vt_malicious: int):
    score = 0
    reasons = []

    parsed = urlparse(url)
    domain = parsed.netloc.lower() or parsed.path.lower()
    domain_label = domain.split(".")[0]

    trusted = is_trusted_domain(domain)

    if trusted:
       reasons.append("Trusted domain")

    if domain.endswith(".ac.il"):
       reasons.append("Educational domain")
       return score, reasons
    
    if similar_to_brand(domain):
       score += 20
       reasons.append("Domain very similar to known brand")

    if unusual_domain_structure(domain):
        score += 15
        reasons.append("Unusual domain structure")

    if suspicious_tld(domain):
        score += 15
        reasons.append("Suspicious top-level domain")

    if lacks_https(url):
        score += 15
        reasons.append("No HTTPS encryption")

    if overly_complex_path(url):
        score += 10
        reasons.append("Overly complex URL path")
    
    if is_shortened_url(domain):
        score += 20
        reasons.append("URL shortening service used")

    if looks_random_string(domain_label):
        score += 15
        reasons.append("Random-looking domain name")

    if vt_malicious > 0:
        score += vt_malicious * 10
        reasons.append("Detected by security vendors")

    if is_ip_address(domain):
        score += 25
        reasons.append("URL uses IP address instead of domain")

    if suspicious_subdomain(domain):
        score += 15
        reasons.append("Too many subdomains")
    
    if check_google_safe_browsing(url):
        score += 40
        reasons.append("Google Safe Browsing flagged this URL")

    return score, reasons

def check_google_safe_browsing(url: str):
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GSB_API_KEY}"

    payload = {
        "client": {
            "clientId": "blinkguard",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": url}
            ]
        }
    }

    response = requests.post(endpoint, json=payload)
    response.raise_for_status()

    result = response.json()

    if "matches" in result:
        return True
    return False
def check_url_virustotal(url: str):

    headers = {"x-apikey": VT_API_KEY}

    # encode URL as VirusTotal expects
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")

    submit_resp = requests.post(
        "https://www.virustotal.com/api/v3/urls",
        headers=headers,
        data={"url": url}
    )

    if submit_resp.status_code != 200:
        raise Exception(f"VirusTotal submit failed: {submit_resp.text}")

    analysis_id = submit_resp.json()["data"]["id"]

    for _ in range(5):

        time.sleep(3)

        analysis_resp = requests.get(
          f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
          headers=headers
        )
        data = analysis_resp.json()

        if data["data"]["attributes"]["status"] == "completed":
           break

    stats = data["data"]["attributes"]["stats"]

    malicious = stats.get("malicious", 0)
    harmless = stats.get("harmless", 0)
    suspicious = stats.get("suspicious", 0)

    if malicious == 0:
        base_risk = 0
    elif malicious <= 2:
        base_risk = 40
    elif malicious <= 5:
        base_risk = 70
    else:
        base_risk = 90

    heuristic_score, reasons = heuristic_analysis(url, malicious)
    final_risk_score = min(100, base_risk + heuristic_score)

    if "Trusted domain" in reasons:
        final_verdict = "safe"
    elif final_risk_score < 30:
        final_verdict = "unknown"
    elif final_risk_score < 60:
        final_verdict = "suspicious"
    else:
        final_verdict = "dangerous"

    total_votes = malicious + harmless + suspicious
    confidence_percent = round(
        (malicious / total_votes) * 100, 2
    ) if total_votes > 0 else 0

    return {
        "url": url,
        "verdict": final_verdict,
        "risk_score": final_risk_score,
        "engine_detection": f"{malicious}/{total_votes} engines",
        "heuristic_reasons": reasons,
        "details": stats
    }

def print_result(result: dict):
    print(f"URL: {result['url']}")
    print(f"Verdict: {result['verdict'].upper()}")
    print(f"Risk Score: {result['risk_score']}/100")
    print(f"Engine Detection: {result['engine_detection']}")

    if result["heuristic_reasons"]:
        print("Heuristic indicators triggered:")
        for reason in result["heuristic_reasons"]:
            print(f"  - {reason}")
    else:
        print("Heuristic indicators triggered: None")

    stats = result["details"]
    print("VirusTotal detections:")
    print(f"  malicious: {stats.get('malicious', 0)}")
    print(f"  harmless: {stats.get('harmless', 0)}")
    print(f"  suspicious: {stats.get('suspicious', 0)}")

    
import sys
import json

if __name__ == "__main__":
    url = sys.argv[1]

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    original_url = url
    expanded_url = expand_url(url)

    result = check_url_virustotal(expanded_url)

    result["url"] = original_url
    result["expanded_url"] = expanded_url

    print(json.dumps(result))