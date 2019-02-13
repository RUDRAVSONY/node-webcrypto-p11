import * as assert from "assert";
import { CryptoKey } from "../src";
import { CryptoKeyPair } from "../src/key";
import { crypto } from "./config";
import { isNSS } from "./helper";

(isNSS("KeyStorage. NSS is readonly")
  ? context.skip
  : context)
  ("KeyStorage", () => {

    beforeEach(async () => {
      let keys = await crypto.keyStorage.keys();
      if (keys.length) {
        await crypto.keyStorage.clear();
      }
      keys = await crypto.keyStorage.keys();
      assert.equal(keys.length, 0);
    });

    context("indexOf", () => {
      ["privateKey", "publicKey"].forEach((type) => {
        it(type, async () => {
          const algorithm: RsaHashedKeyGenParams = {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
            publicExponent: new Uint8Array([1, 0, 1]),
            modulusLength: 1024,
          };
          const keys = await crypto.subtle.generateKey(algorithm, false, ["sign", "verify"]) as CryptoKeyPair;
          const key = (keys as any)[type] as CryptoKey;
          const index = await crypto.keyStorage.setItem(key);
          const found = await crypto.keyStorage.indexOf(key);
          assert.equal(found, null);

          const keyByIndex = await crypto.keyStorage.getItem(index);
          assert.equal(keyByIndex.key.id.toString("hex"), key.key.id.toString("hex"));
        });
      });
    });

    it("set/get item", async () => {
      let indexes = await crypto.keyStorage.keys();
      assert.equal(indexes.length, 0);
      const algorithm: AesKeyGenParams = {
        name: "AES-CBC",
        length: 256,
      };
      const key = await crypto.subtle.generateKey(algorithm, true, ["encrypt", "decrypt"]) as CryptoKey;
      assert.equal(!!key, true, "Has no key value");

      // Set key
      const index = await crypto.keyStorage.setItem(key);

      // Check indexes amount
      indexes = await crypto.keyStorage.keys();
      assert.equal(indexes.length, 1, "Wrong amount of indexes in storage");
      assert.equal(indexes[0], index, "Wrong index of item in storage");

      // Get key
      const aesKey = await crypto.keyStorage.getItem(index);
      assert.equal(!!aesKey, true);
      assert.equal(aesKey.key.id.toString("hex"), key.key.id.toString("hex"));
    });

    it("remove item", async () => {
      const algorithm: RsaHashedKeyGenParams = {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
        publicExponent: new Uint8Array([1, 0, 1]),
        modulusLength: 2048,
      };
      const keys = await crypto.subtle.generateKey(algorithm, false, ["sign", "verify"]) as CryptoKeyPair;

      // Set keys to storage
      await crypto.keyStorage.setItem(keys.publicKey);
      await crypto.keyStorage.setItem(keys.privateKey);

      // Check indexes amount
      let indexes = await crypto.keyStorage.keys();
      assert.equal(indexes.length, 2);

      // Remove first item
      await crypto.keyStorage.removeItem(indexes[0]);

      // Check indexes amount
      indexes = await crypto.keyStorage.keys();
      assert.equal(indexes.length, 1);
    });

    context("getItem", () => {

      it("wrong key identity", async () => {
        const key = await crypto.keyStorage.getItem("key not exist");
        assert.equal(key, null);
      });

      context("with algorithm", () => {
        it("RSASSA-PKCS1-v1_5", async () => {
          const algorithm: RsaHashedKeyGenParams = {
            name: "RSA-PSS",
            hash: "SHA-1",
            publicExponent: new Uint8Array([1, 0, 1]),
            modulusLength: 2048,
          };
          const keys = await crypto.subtle.generateKey(algorithm, false, ["sign", "verify"]) as CryptoKeyPair;

          // Set key to storage
          const index = await crypto.keyStorage.setItem(keys.publicKey);

          // Check indexes
          const indexes = await crypto.keyStorage.keys();
          assert.equal(indexes.length, 1);

          // Get key from storage and set algorithm
          const key = await crypto.keyStorage.getItem(
            index,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" } as RsaHashedImportParams,
            ["verify"],
          );
          assert.equal(key.algorithm.name, "RSASSA-PKCS1-v1_5");
          assert.equal((key.algorithm as RsaHashedKeyAlgorithm).hash.name, "SHA-512");
          assert.deepEqual(key.usages, ["verify"]);
        });

        context("with default algorithm", () => {

          it("RSASSA-PKCS1-v1_5", async () => {
            const keys = await crypto.subtle.generateKey(
              {
                name: "RSA-PSS",
                hash: "SHA-1",
                publicExponent: new Uint8Array([1, 0, 1]),
                modulusLength: 2048,
              } as RsaHashedKeyGenParams,
              false,
              ["sign", "verify"],
            ) as CryptoKeyPair;

            // Set key to storage
            const index = await crypto.keyStorage.setItem(keys.publicKey);

            // Check indexes
            const indexes = await crypto.keyStorage.keys();
            assert.equal(indexes.length, 1);

            // Get key from storage with default alg
            const key = await crypto.keyStorage.getItem(index);

            assert.equal(key.algorithm.name, "RSASSA-PKCS1-v1_5");
            assert.equal((key.algorithm as RsaHashedKeyAlgorithm).hash.name, "SHA-256");
            assert.equal(key.usages.join(","), "verify");
          });

          it("ECDSA P-256", async () => {
            const keys = await crypto.subtle.generateKey(
              {
                name: "ECDSA",
                namedCurve: "P-256",
              } as EcKeyGenParams,
              false,
              ["sign", "verify"],
            ) as CryptoKeyPair;

            // Set key to storage
            const index = await crypto.keyStorage.setItem(keys.publicKey);

            // Check indexes
            const indexes = await crypto.keyStorage.keys();
            assert.equal(indexes.length, 1);

            // Get key from storage with default alg
            const key = await crypto.keyStorage.getItem(index);
            assert.equal(key.algorithm.name, "ECDSA");
            assert.equal((key.algorithm as EcKeyAlgorithm).namedCurve, "P-256");
            assert.equal(key.usages.join(","), "verify");
          });

          it("ECDSA P-521", async () => {
            const keys = await crypto.subtle.generateKey({
              name: "ECDSA",
              namedCurve: "P-521",
            } as EcKeyGenParams,
              false,
              ["sign", "verify"],
            ) as CryptoKeyPair;

            // Set key to storage
            const index = await crypto.keyStorage.setItem(keys.publicKey);

            // Check indexes
            const indexes = await crypto.keyStorage.keys();
            assert.equal(indexes.length, 1);

            // Get key from storage with default alg
            const key = await crypto.keyStorage.getItem(index);
            assert.equal(key.algorithm.name, "ECDSA");
            assert.equal((key.algorithm as EcKeyAlgorithm).namedCurve, "P-521");
            assert.equal(key.usages.join(","), "verify");
          });

          it("RSA-OAEP", async () => {
            const keys = await crypto.subtle.generateKey({
              name: "RSA-OAEP",
              hash: "SHA-1",
              publicExponent: new Uint8Array([1, 0, 1]),
              modulusLength: 2048,
            } as RsaKeyGenParams,
              false,
              ["encrypt", "decrypt"],
            ) as CryptoKeyPair;

            // Set key to storage
            const index = await crypto.keyStorage.setItem(keys.publicKey);

            // Check indexes
            const indexes = await crypto.keyStorage.keys();
            assert.equal(indexes.length, 1);

            // Get key from storage we default alg
            const key = await crypto.keyStorage.getItem(index);
            assert.equal(key.algorithm.name, "RSA-OAEP");
            assert.equal((key.algorithm as RsaHashedKeyAlgorithm).hash.name, "SHA-256");
            assert.equal(key.usages.join(","), "encrypt");

          });

          it("AES-CBC", async () => {
            const aesKey = await crypto.subtle.generateKey({
              name: "AES-CBC",
              length: 256,
            } as AesKeyGenParams,
              false,
              ["encrypt", "decrypt"],
            ) as CryptoKey;

            // Set key to storage
            const index = await crypto.keyStorage.setItem(aesKey);

            // Check indexes
            const indexes = await crypto.keyStorage.keys();
            assert.equal(indexes.length, 1);

            // Get key from storage we default alg
            const key = await crypto.keyStorage.getItem(index);
            assert.equal(key.algorithm.name, "AES-CBC");
            assert.equal(key.usages.join(","), "encrypt,decrypt");
          });
        });

        it("ECDH", async () => {
          const keys = await crypto.subtle.generateKey(
            {
              name: "ECDH",
              namedCurve: "P-384",
            } as EcKeyGenParams,
            false,
            ["deriveBits"],
          ) as CryptoKeyPair;
          // Set key to storage
          const index = await crypto.keyStorage.setItem(keys.publicKey);

          // Check indexes
          const indexes = await crypto.keyStorage.keys();
          assert.equal(indexes.length, 1);

          // Get key from storage we default alg
          const key = await crypto.keyStorage.getItem(index);
          assert.equal(key.algorithm.name, "ECDH");
          assert.equal((key.algorithm as EcKeyAlgorithm).namedCurve, "P-384");
          assert.equal(key.usages.join(","), "");
        });

      });

    });

  });