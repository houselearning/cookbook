import os, requests, datetime
from firebase_admin import credentials, db, initialize_app

# 1. Initialize Firebase
cred = credentials.Certificate("service-account.json")
initialize_app(cred, {'databaseURL': 'https://contract-center-llc-10-default-rtdb.firebaseio.com/'})

def generate():
    # Load ingredients list
    with open("list.txt", "r") as f:
        items = f.read().splitlines()
    
    # Pick ingredient based on day of year
    idx = datetime.datetime.now().timetuple().tm_yday % len(items)
    ingredient = items[idx]

    # Hugging Face API Request
    HF_API = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
    headers = {"Authorization": f"Bearer {os.getenv('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')}"}
    prompt = f"Write a recipe for {ingredient}. Use Markdown headers: # Name, ## Cook Info, ## Ingredients, ## Cook Notes."
    
    response = requests.post(HF_API, headers=headers, json={"inputs": prompt})
    recipe_markdown = response.json()[0]['generated_text']

    # Push to Firebase Realtime DB
    db.reference('daily_recipes/today').set({
        "date": str(datetime.date.today()),
        "content": recipe_markdown
    })

if __name__ == "__main__":
    generate()
