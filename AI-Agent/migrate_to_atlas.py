from pymongo import MongoClient
import sys

# 1. LOCAL CONNECTION
local_client = MongoClient('mongodb://localhost:27017/')
local_db = local_client['fintel_ai']

# 2. CLOUD CONNECTION (Standard string to bypass DNS)
atlas_uri = 'mongodb://parthhindiya_db_user:parth123@ac-l39shbn-shard-00-00.dma20ug.mongodb.net:27017,ac-l39shbn-shard-00-01.dma20ug.mongodb.net:27017,ac-l39shbn-shard-00-02.dma20ug.mongodb.net:27017/fintel_ai?ssl=true&replicaSet=atlas-4momh1-shard-0&authSource=admin&appName=Cluster0'
cloud_client = MongoClient(atlas_uri)
cloud_db = cloud_client.get_database()

print("🚀 Starting Cloud Migration (Local -> MongoDB Atlas)...")

# Collections to migrate
collections = ['invoices', 'vendors', 'anomalies']

for coll_name in collections:
    # Fetch from local
    local_data = list(local_db[coll_name].find({}))
    
    if local_data:
        print(f"📦 Found {len(local_data)} records in local '{coll_name}'. Migrating...")
        
        # Insert into cloud (Delete existing if any for fresh sync)
        cloud_db[coll_name].delete_many({})
        cloud_db[coll_name].insert_many(local_data)
        
        print(f"✅ Successfully migrated '{coll_name}' to the Cloud!")
    else:
        print(f"⚠️ No records found in local '{coll_name}'.")

print("\n✨ MIGRATION COMPLETE! 🏁")
print("Your invoices, vendors, and anomalies are now in MongoDB Atlas Cloud.")
