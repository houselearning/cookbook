import os, requests, json, datetime

HF_API_KEY = os.getenv("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")
HF_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

def fetch_and_format():
    # 1. Fetch real recipe
    resp = requests.get("https://www.themealdb.com/api/json/v1/1/random.php").json()
    meal = resp['meals'][0]
    
    # 2. AI Formatting Prompt
    prompt = f"Format this recipe in Markdown for students. Name: {meal['strMeal']}. Instructions: {meal['strInstructions']}. Add a 'Pro Tip' section."
    
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": f"<s>[INST] {prompt} [/INST]", "parameters": {"max_new_tokens": 600}}
    
    ai_resp = requests.post(HF_URL, headers=headers, json=payload).json()
    markdown = ai_resp[0]['generated_text'].split("[/INST]")[-1]

    # 3. Create Data Object
    today = datetime.date.today().strftime("%Y-%m-%d")
    recipe_data = {
        "date": today,
        "title": meal['strMeal'],
        "image": meal['strMealThumb'],
        "content": markdown
    }

    # 4. Save Current and Archive
    os.makedirs("archive", exist_ok=True)
    with open("daily_recipe.json", "w") as f:
        json.dump(recipe_data, f)
    with open(f"archive/{today}.json", "w") as f:
        json.dump(recipe_data, f)

    # 5. Update History Index (for the sidebar)
    history = []
    if os.path.exists("history.json"):
        with open("history.json", "r") as f:
            history = json.load(f)
    
    # Add to start, keep last 30
    history.insert(0, {"date": today, "title": meal['strMeal']})
    with open("history.json", "w") as f:
        json.dump(history[:30], f)

if __name__ == "__main__":
    fetch_and_format()
