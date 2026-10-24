from getpass import getpass
from app.auth import hash_password

password = getpass("Create your NEW admin password: ")
confirm = getpass("Confirm your NEW admin password: ")

if password != confirm:
    print("Passwords do not match. Run the script again.")
else:
    print("\nADMIN_PASSWORD_HASH=" + hash_password(password))