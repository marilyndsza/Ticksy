#!/usr/bin/env python3

import requests
import sys
import os
from datetime import datetime

class TicksyAPITester:
    def __init__(self):
        # Get backend URL from frontend .env
        self.base_url = "https://attendance-builder.preview.emergentagent.com"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {response_data}")
                except:
                    print(f"Response: {response.text[:200]}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")

            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "api/health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "api/",
            200
        )
        return success

def main():
    print("🚀 Starting Ticksy Backend API Tests")
    print("=" * 50)
    
    tester = TicksyAPITester()
    
    # Test backend endpoints
    tester.test_root_endpoint()
    tester.test_health_endpoint()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("❌ Some backend tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())