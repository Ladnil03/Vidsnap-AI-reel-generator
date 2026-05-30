#!/usr/bin/env python
"""
Create the first admin user in VidSnap AI.

Run this script once after setup to create your admin account.
Usage: python create_admin.py
"""

import asyncio
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from backend.config import settings
from backend.utils.auth_utils import hash_password

# Load environment variables
load_dotenv()


async def create_admin_user() -> None:
    """
    Interactive script to create the first admin user.

    Connects to MongoDB, validates input, and inserts admin user document.
    """
    # Get user input
    print("\n" + "=" * 60)
    print("VidSnap AI — Admin User Creation")
    print("=" * 60 + "\n")

    name = input("Admin name: ").strip()
    if not name:
        print("❌ Name cannot be empty.")
        return

    email = input("Admin email: ").strip()
    if not email or "@" not in email:
        print("❌ Invalid email address.")
        return

    password = input("Admin password (min 8 chars): ").strip()
    if len(password) < 8:
        print("❌ Password must be at least 8 characters.")
        return

    # Connect to MongoDB
    print("\nConnecting to MongoDB...")
    try:
        client = AsyncIOMotorClient(settings.mongodb_uri)
        db = client[settings.mongodb_db]

        # Verify connection
        await client.admin.command("ping")
        print("✅ Connected to MongoDB")
    except Exception as error:
        print(f"❌ Failed to connect to MongoDB: {error}")
        return

    # Check if user already exists
    print(f"Checking if email '{email}' already exists...")
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        print("❌ User already exists with this email.")
        client.close()
        return

    # Build admin user document
    admin_doc = {
        "user_id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "tokens_remaining": 999,
        "is_admin": True,
        "otp": None,
        "otp_created_at": None,
        "created_at": datetime.now(timezone.utc),
    }

    # Insert into database
    try:
        result = await db.users.insert_one(admin_doc)
        print(f"\n✅ Admin user created successfully!")
        print(f"   User ID: {admin_doc['user_id']}")
        print(f"   Email: {email}")
        print(f"   Tokens: {admin_doc['tokens_remaining']}")
        print(f"   Admin: Yes\n")
    except Exception as error:
        print(f"❌ Failed to create admin user: {error}")
    finally:
        client.close()
        print("Connection closed.")


if __name__ == "__main__":
    asyncio.run(create_admin_user())
