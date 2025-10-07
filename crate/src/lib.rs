use std::{
    error::Error,
    fmt,
};
use wasm_bindgen::prelude::*;
use p256::ecdsa::{SigningKey, VerifyingKey};
use p256::elliptic_curve::sec1::EncodedPoint;
use argon2::{
    password_hash::{SaltString, PasswordHasher},
    Argon2
};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm,
    Nonce
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::{RngCore, thread_rng};
use web_sys::console;

#[wasm_bindgen(start)]
pub fn wasm_main() {
    console::log_1(&"WASM module initialized - All cryptographic operations will be performed locally in WebAssembly".into());
}

#[wasm_bindgen]
pub struct KeyPair {
    public_key: String,
    private_key: Vec<u8>,
}

#[wasm_bindgen]
impl KeyPair {
    #[wasm_bindgen(getter, js_name = publicKey)]
    pub fn public_key(&self) -> String {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter, js_name = privateKey)]
    pub fn private_key(&self) -> Vec<u8> {
        self.private_key.clone()
    }
}

#[wasm_bindgen]
pub fn generate_keypair() -> Result<KeyPair, JsValue> {
    console::log_1(&"[WASM] Starting ECDSA keypair generation...".into());

    let signing_key = SigningKey::random(&mut thread_rng());
    let verifying_key = VerifyingKey::from(&signing_key);
    let encoded_point = EncodedPoint::from(verifying_key);
    let public_key = BASE64.encode(encoded_point.as_bytes());
    let private_key = signing_key.to_bytes().as_slice().to_vec();

    console::log_1(&format!("[WASM] Generated keypair - Public key length: {}, Private key length: {}", 
        public_key.len(), private_key.len()).into());

    Ok(KeyPair {
        public_key,
        private_key,
    })
}

#[wasm_bindgen]
pub fn derive_key(password: &str, existing_salt: Option<String>) -> Result<JsValue, JsValue> {
    console::log_1(&"[WASM] Starting key derivation...".into());

    let salt = if let Some(salt_str) = existing_salt {
        console::log_1(&format!("[WASM] Using existing salt: {}", salt_str).into());
        SaltString::from_b64(&salt_str)
            .map_err(|e| JsValue::from_str(&format!("Invalid salt format: {}", e)))?
    } else {
        console::log_1(&"[WASM] Generating new salt...".into());
        SaltString::generate(&mut thread_rng())
    };

    let argon2 = Argon2::default();
    console::log_1(&"[WASM] Configured Argon2id for password hashing".into());

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| JsValue::from_str(&format!("Password hashing failed: {}", e)))?;

    let hash = password_hash.hash.unwrap();
    let hash_str = BASE64.encode(hash.as_bytes());
    let salt_str = salt.as_str().to_string();

    console::log_1(&format!("[WASM] Key derivation complete - Hash length: {}, Salt length: {}", 
        hash_str.len(), salt_str.len()).into());

    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"key".into(), &hash_str.into())?;
    js_sys::Reflect::set(&result, &"salt".into(), &salt_str.into())?;

    Ok(result.into())
}

#[wasm_bindgen]
pub fn encrypt_private_key(keypair: &KeyPair, derived_key: &str) -> Result<String, JsValue> {
    console::log_1(&"[WASM] Starting private key encryption...".into());

    let key_bytes = BASE64.decode(derived_key)
        .map_err(|e| JsValue::from_str(&format!("Invalid derived key format: {}", e)))?;

    if key_bytes.len() < 32 {
        return Err(JsValue::from_str(&format!("Derived key too short: {} bytes", key_bytes.len())));
    }

    let cipher = Aes256Gcm::new_from_slice(&key_bytes[0..32])
        .map_err(|e| JsValue::from_str(&format!("Cipher creation failed: {}", e)))?;

    let mut nonce = [0u8; 12];
    thread_rng().fill_bytes(&mut nonce);
    let nonce = Nonce::from_slice(&nonce);

    let ciphertext = cipher
        .encrypt(nonce, keypair.private_key.as_slice())
        .map_err(|e| JsValue::from_str(&format!("Encryption failed: {}", e)))?;

    let mut output = nonce.to_vec();
    output.extend_from_slice(&ciphertext);

    let encoded = BASE64.encode(&output);
    console::log_1(&format!("[WASM] Private key encrypted successfully - Output length: {}", encoded.len()).into());

    Ok(encoded)
}

#[wasm_bindgen]
pub fn decrypt_private_key(encrypted_key: &str, derived_key: &str) -> Result<Vec<u8>, JsValue> {
    console::log_1(&"[WASM] Starting private key decryption...".into());

    let key_bytes = BASE64.decode(derived_key)
        .map_err(|e| JsValue::from_str(&format!("Invalid derived key format: {}", e)))?;

    if key_bytes.len() < 32 {
        return Err(JsValue::from_str(&format!("Derived key too short: {} bytes", key_bytes.len())));
    }

    let encrypted_data = BASE64.decode(encrypted_key)
        .map_err(|e| JsValue::from_str(&format!("Base64 decoding failed: {}", e)))?;

    if encrypted_data.len() < 12 {
        return Err(JsValue::from_str("Invalid encrypted data: too short"));
    }

    let (nonce, ciphertext) = encrypted_data.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(&key_bytes[0..32])
        .map_err(|e| JsValue::from_str(&format!("Cipher creation failed: {}", e)))?;

    let decrypted = cipher
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|e| JsValue::from_str(&format!("Decryption failed: {}", e)))?;

    console::log_1(&format!("[WASM] Private key decrypted successfully - Output length: {}", decrypted.len()).into());

    Ok(decrypted)
}

#[wasm_bindgen]
pub fn generate_random_key() -> Result<String, JsValue> {
    console::log_1(&"[WASM] Generating random encryption key...".into());
    
    let mut key = [0u8; 32];
    thread_rng().fill_bytes(&mut key);
    let encoded = BASE64.encode(&key);
    
    console::log_1(&format!("[WASM] Random key generated - Length: {} bytes", key.len()).into());
    
    Ok(encoded)
}

#[wasm_bindgen]
pub fn encrypt_data(data: &str, key: &str) -> Result<String, JsValue> {
    console::log_1(&"[WASM] Starting data encryption...".into());

    let key_bytes = BASE64.decode(key)
        .map_err(|e| JsValue::from_str(&format!("Invalid key format: {}", e)))?;

    if key_bytes.len() < 32 {
        return Err(JsValue::from_str(&format!("Key too short: {} bytes", key_bytes.len())));
    }

    let cipher = Aes256Gcm::new_from_slice(&key_bytes[0..32])
        .map_err(|e| JsValue::from_str(&format!("Cipher creation failed: {}", e)))?;

    let mut nonce = [0u8; 12];
    thread_rng().fill_bytes(&mut nonce);
    let nonce = Nonce::from_slice(&nonce);

    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| JsValue::from_str(&format!("Encryption failed: {}", e)))?;

    let mut output = nonce.to_vec();
    output.extend_from_slice(&ciphertext);

    let encoded = BASE64.encode(&output);
    console::log_1(&format!("[WASM] Data encrypted successfully - Input length: {}, Output length: {}", 
        data.len(), encoded.len()).into());

    Ok(encoded)
}

#[wasm_bindgen]
pub fn decrypt_data(encrypted_data_str: &str, key: &str) -> Result<String, JsValue> {
    console::log_1(&"[WASM] Starting data decryption...".into());

    let key_bytes = BASE64.decode(key)
        .map_err(|e| JsValue::from_str(&format!("Invalid key format: {}", e)))?;

    if key_bytes.len() < 32 {
        return Err(JsValue::from_str(&format!("Key too short: {} bytes", key_bytes.len())));
    }

    let encrypted_data = BASE64.decode(encrypted_data_str)
        .map_err(|e| JsValue::from_str(&format!("Base64 decoding failed: {}", e)))?;

    if encrypted_data.len() < 12 {
        return Err(JsValue::from_str("Invalid encrypted data: too short"));
    }

    let (nonce, ciphertext) = encrypted_data.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(&key_bytes[0..32])
        .map_err(|e| JsValue::from_str(&format!("Cipher creation failed: {}", e)))?;

    let decrypted = cipher
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|e| JsValue::from_str(&format!("Decryption failed: {}", e)))?;

    let decoded_string = String::from_utf8(decrypted)
        .map_err(|e| JsValue::from_str(&format!("UTF-8 decoding failed: {}", e)))?;

    console::log_1(&format!("[WASM] Data decrypted successfully - Output length: {}", decoded_string.len()).into());

    Ok(decoded_string)
}