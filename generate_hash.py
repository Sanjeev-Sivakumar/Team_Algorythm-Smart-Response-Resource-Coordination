import bcrypt

# Generate password hash for 'admin123'
password = 'admin123'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10))
print(f"Password hash for '{password}':")
print(hashed.decode('utf-8'))
