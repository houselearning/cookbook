"""
Daily AI recipe generator.
Run once per day (GitHub Actions cron or Cloud Scheduler -> Cloud Run).
Reads list.txt (one ingredient per line), cycles through entries for a year,
builds a prompt, calls Hugging Face text-generation, converts markdown->html,
and saves result to Firestore (dailyRecipe doc). Uses service account env vars.
"""
import os, json, random, datetime, pathlib, base64, requests
from markdown import markdown
from google.cloud import firestore
from google.oauth2 import service_account

# config via env vars
HF_API_TOKEN = os.environ.get('HF_API_TOKEN')  # Hugging Face token
GCP_SA_JSON = os.environ.get('GCP_SA_JSON')    # base64-encoded service account JSON
LIST_PATH = os.environ.get('LIST_PATH', 'untitled://untitled/list.txt')  # path inside repo or mounted storage

# Initialize Firestore admin client
creds = None
if GCP_SA_JSON:
    sa_json = json.loads(base64.b64decode(GCP_SA_JSON).decode())
    creds = service_account.Credentials.from_service_account_info(sa_json)
db = firestore.Client(credentials=creds, project=creds.project_id if creds else None)

# load ingredient list and rotate daily index persisted in Firestore
def load_list(path):
    p = pathlib.Path(path)
    if not p.exists():
        return ["eggs", "flour", "milk"]
    return [line.strip() for line in p.read_text().splitlines() if line.strip()]

def get_next_item(items):
    meta_ref = db.collection('cookbook_meta').document('rotation')
    doc = meta_ref.get()
    idx = 0
    if doc.exists:
        data = doc.to_dict()
        idx = data.get('index', 0) + 1
    idx = idx % len(items)
    meta_ref.set({'index': idx, 'last': datetime.date.today().isoformat()})
    return items[idx]

def build_prompt(item):
    prompt = f"""You are House Learning Recipe Writer. Create a full cooking recipe in Markdown for a Daily Recipe featuring "{item}".
- Include Title, Prep Time, Cook Time, Servings, Ingredients (bullet list), Steps (numbered), Tips, Nutrition (brief).
- Keep language friendly for classroom use. Avoid allergens warnings but include a "Allergy note" section.
Return only Markdown."""
    return prompt

def call_hf(prompt):
    url = "https://api-inference.huggingface.co/models/gpt2"  # replace with chosen model or endpoint
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    payload = {"inputs": prompt, "options": {"wait_for_model": True, "use_cache": False}}
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    # model output parsing depends on model: many return text directly
    out = r.json()
    if isinstance(out, dict) and 'generated_text' in out:
        return out['generated_text']
    # fallback: join texts
    if isinstance(out, list):
        return out[0].get('generated_text') if out and isinstance(out[0], dict) else str(out)
    return str(out)

def save_daily_recipe(title, markdown_text, html_text, ingredient):
    doc_ref = db.collection('cookbook').document('dailyRecipe')
    doc_ref.set({
        'title': title,
        'markdown': markdown_text,
        'html': html_text,
        'ingredient': ingredient,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'source': 'ai'
    })

def main():
    items = load_list(LIST_PATH)
    item = get_next_item(items)
    prompt = build_prompt(item)
    md_text = call_hf(prompt)
    # minimal cleanup: ensure markdown_text exists
    html_text = markdown(md_text, extensions=['fenced_code','tables'])
    # Extract title from first Markdown header if present
    title = md_text.splitlines()[0].lstrip('# ').strip() if md_text.startswith('#') else f'Daily Recipe: {item}'
    save_daily_recipe(title, md_text, html_text, item)
    print(f"Saved daily recipe for {item} - {title}")

if __name__ == "__main__":
    main()
