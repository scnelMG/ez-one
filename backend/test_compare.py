import requests

# Login
login_url = "http://localhost:8080/api/auth/login"
login_data = {"email": "tester@test.com", "password": "password"}
session = requests.Session()
res = session.post(login_url, json=login_data)
print("Login status:", res.status_code)
print("Login response:", res.text)
