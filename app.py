#!/usr/bin/env python3
"""
Infinite Adventure - Main Application Entry Point

A procedural dark fantasy text adventure powered by Gemini AI.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from src.api import create_app

# Create Flask application
app = create_app()

if __name__ == '__main__':
    # Check for API key
    if not os.getenv('GEMINI_API_KEY'):
        print("\n" + "="*60)
        print("WARNING: GEMINI_API_KEY not found in environment!")
        print("Create a .env file with: GEMINI_API_KEY=your_key_here")
        print("Get an API key from: https://makersuite.google.com/app/apikey")
        print("="*60 + "\n")

    # Run development server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
