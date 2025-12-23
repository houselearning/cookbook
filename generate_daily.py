import os
import requests
import json

# Configuration
HF_API_KEY = os.getenv("HF_API_KEY")
HF_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

def fetch_real_recipe():
    # Fetch a random real recipe from TheMealDB (Free API)
    response = requests.get("https://www.themealdb.com/api/json/v1/1/random.php")
    data = response.json()
    return data['meals'][0]

def format_with_ai(raw_recipe):
    # Extract raw data
    title = raw_recipe['strMeal']
    instructions = raw_recipe['strInstructions']
    
    # Prepare AI Prompt
    prompt = f"""
    Format this real recipe into the 'House Learning Cookbook' Markdown style.
    Recipe Name: {title}
    Raw Instructions: {instructions}
    
    Requirements:
    1. Use # for the main title.
    2. Use ## for 'Ingredients' and 'Instructions' sections.
    3. Ensure instructions are in a numbered list.
    4. Add a 'Teacher's Tip' section at the end about food safety.
    """
    
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": f"<s>[INST] {prompt} [/INST]", "parameters": {"max_new_tokens": 700}}
    
    response = requests.post(HF_URL, headers=headers, json=payload)
    formatted_markdown = response.json()[0]['generated_text'].split("[/INST]")[-1]
    return formatted_markdown

def main():
    real_recipe = fetch_real_recipe()
    markdown_recipe = format_with_ai(real_recipe)
    
    output = {
        "date": "2025-12-23",
        "title": real_recipe['strMeal'],
        "source": "TheMealDB",
        "image": real_recipe['strMealThumb'], # Real photo link
        "content": markdown_recipe
    }
    
    with open("daily_recipe.json", "w") as f:
        json.dump(output, f, indent=2)

if __name__ == "__main__":
    main()
