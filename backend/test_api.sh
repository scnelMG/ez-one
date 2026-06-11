#!/bin/bash
sleep 15
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/signup \
-H "Content-Type: application/json" \
-d '{"email":"test5@example.com","password":"password123","name":"테스트유저5"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test5@example.com","password":"password123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

echo "Token: $TOKEN"

echo "Creating study group..."
STUDY_RES=$(curl -s -X POST http://localhost:8080/api/study \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $TOKEN" \
-d '{"name":"Backend Study","description":"Testing the backend API"}')
echo $STUDY_RES
STUDY_ID=$(echo $STUDY_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "Study ID: $STUDY_ID"

if [ -n "$STUDY_ID" ] && [ "$STUDY_ID" != "null" ]; then
  echo "Listing my studies..."
  curl -s -X GET http://localhost:8080/api/study/my \
  -H "Authorization: Bearer $TOKEN"
  echo ""

  echo "Recommending job..."
  curl -s -X POST http://localhost:8080/api/study/$STUDY_ID/job \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"companyName":"Google","positionTitle":"Software Engineer","deadlineLabel":"D-10","sourceUrl":"https://google.com"}'
  echo ""
  
  echo "Test completed successfully."
else
  echo "Failed to create study group."
fi
