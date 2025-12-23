import os
import requests
import random
import json

# Configuration
HF_API_KEY = os.getenv("HF_API_KEY")
API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

def get_ingredient():
    with open("list.txt", "r") as f:
        ingredients = f.read().splitlines()
    return random.choice(ingredients)

def generate_recipe():
    ingredient = get_ingredient()
    prompt = f"Create a healthy family recipe using {ingredient}. Format in Markdown with headers for Ingredients and Instructions."
    
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": f"<s>[INST] {prompt} [/INST]", "parameters": {"max_new_tokens": 500}}
    
    response = requests.post(API_URL, headers=headers, json=payload)
    recipe_text = response.json()[0]['generated_text'].split("[/INST]")[-1]
    
    # Save as JSON for the frontend to fetch
    with open("daily_recipe.json", "w") as f:
        json.dump({"date": "2025-12-23", "content": recipe_text, "ingredient": ingredient}, f)

if __name__ == "__main__":
    generate_recipe()
