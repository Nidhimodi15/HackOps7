from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['fintel_ai']

inv = list(db.invoices.find().sort('uploadDate', -1).limit(1))[0]
gst = inv.get('gstNumber', 'N/A')

print(f'GST Number: [{gst}]')
print(f'Length: {len(gst)}')
print(f'Has space: {" " in gst}')
print(f'Repr: {repr(gst)}')
print(f'Cleaned: [{gst.replace(" ", "")}]')
print(f'All GST: {inv.get("allGstNumbers", [])}')
