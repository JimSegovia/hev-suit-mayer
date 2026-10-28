import requests

API = 'https://api.printables.com/graphql/'
MODEL = '1462731'
query = '''query ModelFiles($id: ID!) { model: print(id: $id) { id filesType stls { id name fileSize } otherFiles { id name fileSize } } }'''
r = requests.post(API, json={'operationName': 'ModelFiles', 'query': query, 'variables': {'id': MODEL}}, timeout=30)
print(r.status_code, r.text[:12000])
