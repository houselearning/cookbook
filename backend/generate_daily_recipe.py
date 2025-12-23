import os
import random
import datetime
import requests
from markdown import markdown
from google.cloud import firestore
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

HF_API_URL = os.getenv("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2")  # e.g. "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
HF_API_TOKEN = os.getenv("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")

# GOOGLE_APPLICATION_CREDENTIALS should point to service-account.json file
# GitHub Actions sets this env var before running the script
# Firestore client uses this for authentication
db = firestore.Client()

def load_ingredients_list(path="list.txt"):
  """Load a list of ingredients/items from a text file."""
  with open(path, "r", encoding="utf-8") as f:
    items = [line.strip() for line in f if line.strip()]
  return items

def build_prompt(ingredients):
  """Build the prompt for the Hugging Face model using random ingredients."""
  selected = random.sample(ingredients, k=min(5, len(ingredients)))
  ingredient_list = ", ".join(selected)
  today = datetime.date.today().strftime("%B %d, %Y")

  prompt = f"""
You are an AI chef for an educational platform called HouseLearning.
Generate a detailed, creative, and easy-to-follow cooking recipe in MARKDOWN format.

Requirements:
- Title as a level 1 heading (#)
- Short introduction paragraph
- Ingredients as a bullet list
- Step-by-step instructions as a numbered list
- "Cook Notes" section with tips and variations
- Mention that it is AI-generated in a final note.

Use mostly these ingredients: {ingredient_list}.
Date: {today}

Return only Markdown, no explanation.
"""
  return prompt.strip()

def call_huggingface(prompt):
  """Call the Hugging Face text generation API with the given prompt."""
  headers = {
    "Authorization": f"Bearer {HF_API_TOKEN}",
    "Content-Type": "application/json"
  }
  payload = {
    "inputs": prompt,
    "parameters": {
      "max_new_tokens": 800,
      "temperature": 0.8,
      "do_sample": True
    }
  }

  resp = requests.post(HF_API_URL, json=payload, headers=headers, timeout=120)
  resp.raise_for_status()
  data = resp.json()

  # Handle common HF output formats
  if isinstance(data, list) and len(data) > 0 and "generated_text" in data[0]:
    text = data[0]["generated_text"]
    if prompt in text:
      text = text.split(prompt, 1)[1].strip()
    return text.strip()
  elif isinstance(data, dict) and "generated_text" in data:
    return data["generated_text"].strip()
  else:
    raise RuntimeError(f"Unexpected Hugging Face response: {data}")

def markdown_to_html(md_text):
  """Convert Markdown to HTML using python-markdown."""
  return markdown(md_text, extensions=["extra"])

def extract_title_from_markdown(md_text):
  """Extract the first heading as the recipe title."""
  for line in md_text.splitlines():
    line = line.strip()
    if line.startswith("# "):
      return line[2:].strip()
    if line.startswith("#"):
      return line.lstrip("#").strip()
  return "AI Generated Daily Recipe"

def save_recipe_to_firestore(title, markdown_text, html_text):
  """Save the daily recipe into Firestore."""
  doc_ref = db.collection("recipes").document()
  doc_ref.set({
    "title": title,
    "markdown": markdown_text,
    "html": html_text,
    "type": "daily",
    "createdAt": firestore.SERVER_TIMESTAMP,
    "createdBy": "ai",
    "blocked": False
  })
  print(f"Saved daily recipe: {doc_ref.id}")
  return doc_ref.id

def main():
  ingredients = load_ingredients_list("list.txt")
  prompt = build_prompt(ingredients)
  md_recipe = call_huggingface(prompt)
  html_recipe = markdown_to_html(md_recipe)
  title = extract_title_from_markdown(md_recipe)
  save_recipe_to_firestore(title, md_recipe, html_recipe)

if __name__ == "__main__":
  main()
