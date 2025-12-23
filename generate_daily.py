import os, requests, datetime
from firebase_admin import credentials, db, initialize_app

# 1. Config
HF_API = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
cred = credentials.Certificate("firebase-adminsdk.json")
initialize_app(cred, {'databaseURL': 'https://contract-center-llc-10-default-rtdb.firebaseio.com/'})

def run_daily_sync():
    # Read ingredient
    with open("list.txt", "r") as f:
        items = f.read().splitlines()
    
    day_idx = datetime.datetime.now().timetuple().tm_yday % len(items)
    ingredient = items[day_idx]

    # API Call
    headers = {"Authorization": f"Bearer {os.getenv('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')}"}
    prompt = f"Create a Home Economics recipe for {ingredient}. Use Markdown: ## Name, ## Cook Info, ## Ingredients, ## Cook Notes."
    
    res = requests.post(HF_API, headers=headers, json={"inputs": prompt})
    content = res.json()[0]['generated_text']

    # Update Realtime DB
    db.reference('daily_recipes/today').set({
        "id": f"recipe_{datetime.date.today()}",
        "content": content,
        "date": str(datetime.date.today())
    })

if __name__ == "__main__":
    run_daily_sync()
