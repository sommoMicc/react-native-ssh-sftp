import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter
} from "react-native";

const { RNSSHClient } = NativeModules;

const RNSSHClientEmitter = new NativeEventEmitter(RNSSHClient);

const NATIVE_EVENT_SHELL = "Shell";
const NATIVE_EVENT_DOWNLOAD_PROGRESS = "DownloadProgress";
const NATIVE_EVENT_UPLOAD_PROGRESS = "UploadProgress";

/**
 * Manage a connection to an SSH Server
 *
 * Instances of SSHClient are created using the following factory functions:
 * - SSHClient.connectWithKey()
 * - SSHClient.connectWithPassword()
 */
export default class SSHClient {
  /** Connect using a key.
   *
   * @param privateKey
   * The private key, in OpenSSH format.
   * Only support RSA, DSA, ECDSA
   *
   * Return a promise that resolve when the connection is established.
   * privateKey is a string.
   */
  static connectWithKey(
    host,
    port,
    username,
    privateKey,
    passphrase,
    callback
  ) {
    return new Promise((resolve, reject) => {
      const result = new SSHClient(
        host,
        port,
        username,
        {
          privateKey,
          passphrase,
        },
        error => {
          if (callback) {
            callback(error);
          }
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
    });
  }

  /** Connect using a password */
  static connectWithPassword(
    host,
    port,
    username,
    password,
    callback
  ) {
    return new Promise((resolve, reject) => {
      const result = new SSHClient(
        host,
        port,
        username,
        password,
        error => {
          if (callback) {
            callback(error);
          }
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
    });
  }

  /**
   * Generic constructor
   *
   * Should not be called directly; use factory functions instead.
   */
  constructor(host, port, username, passwordOrKey, callback) {
    this._handleEvent = this._handleEvent.bind(this);
    this._unregisterNativeListener = this._unregisterNativeListener.bind(this);
    this._key = SSHClient.getRandomClientKey();
    this._listeners = {};
    this.handlers = {};
    this.host = host;
    this.port = port;
    this.username = username;
    this.passwordOrKey = passwordOrKey;
    this._connect(callback);
  }

  /**
   * Return a random client key.
   *
   * This key is used to identify which callback match with which instance.
   */
  static getRandomClientKey() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  /**
   * Callback used to dispatch events
   */
  _handleEvent (event) {
    if (this.handlers[event.name] && this._key === event.key) {
      this.handlers[event.name](event.value);
    }
  }

  /**
   * Register an event handler
   */
  on(eventName, handler) {
    this.handlers[eventName] = handler;
  }

  /**
   * Register this instance to handle a native event
   *
   * @param eventName
   * Name of the event. Must match when calling unregisterNativeListener()
   */
  _registerNativeListener(eventName) {
    if (eventName === "*") {
      throw new Error("Forbidden event name");
    }
    const listenerInterface = Platform.OS === "ios"
      ? RNSSHClientEmitter
      : DeviceEventEmitter;
    this._listeners[eventName] = listenerInterface
      .addListener(
        eventName,
        this._handleEvent
      );
  }

  /**
   * Unregister a native event listener
   *
   * @param eventName
   * Must match the value from registerNativeListener()
   */
  _unregisterNativeListener(eventName) {
    if (eventName === "*") {
      Object.keys(this._listeners).forEach(
        this._unregisterNativeListener
      );
    } else {
      const listener = this._listeners[eventName];
      if (listener) {
        listener.remove();
        delete this._listeners[eventName];
      }
    }
  }

  /**
   * Perform actual connection to server.
   * Called automatically by constructor.
   */
  _connect(callback) {
    if (Platform.OS === "android") {
      if (typeof this.passwordOrKey === "string") {
        RNSSHClient.connectToHostByPassword(
          this.host, this.port,
          this.username,
          this.passwordOrKey,
          this._key,
          error => {
            callback(error);
          }
        );
      } else {
        RNSSHClient.connectToHostByKey(
          this.host,
          this.port,
          this.username,
          this.passwordOrKey,
          this._key,
          error => {
            callback(error);
          }
        );
      }
    } else {
      RNSSHClient.connectToHost(
        this.host,
        this.port,
        this.username,
        this.passwordOrKey,
        this._key,
        error => {
          callback(error);
        }
      );
    }
  }

  /**
   * Return a promise. Resolve with the output.
   */
  execute(command, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.execute(command, this._key, (error, response) => {
        if (callback) {
          callback(error, response);
        }
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });
  }

  /**
   * Return a promise. Resolve when shell is open.
   * Still depend on the "Shell" event.
   *
   * @param {string} ptyType
   * vanilla, vt100, vt102, vt220, ansi, xterm
   */
  startShell(ptyType, callback) {
    return new Promise((resolve, reject) => {
      this._registerNativeListener(NATIVE_EVENT_SHELL);
      RNSSHClient.startShell(this._key, ptyType, (error, response) => {
        if (callback) {
          callback(error, response);
        }
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });
  }

  /**
   * Return a promise.
   */
  writeToShell(command, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.writeToShell(command, this._key, (error, response) => {
        if (callback) {
          callback(error, response);
        }
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });
  }

  closeShell() {
    this._unregisterNativeListener(NATIVE_EVENT_SHELL);
    RNSSHClient.closeShell(this._key);
  }

  /**
   * Return a promise
   */
  connectSFTP(callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.connectSFTP(this._key, (error) => {
        this._registerNativeListener(NATIVE_EVENT_DOWNLOAD_PROGRESS);
        this._registerNativeListener(NATIVE_EVENT_UPLOAD_PROGRESS);
        if (callback) {
          callback(error);
        }
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Return a promise
   */
  sftpLs(path, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpLs(path, this._key, (error, response) => {
        if (callback) {
          callback(error, response);
        }
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });
  }

  /**
   * Return a promise
   */
  sftpRename(oldPath, newPath, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpRename(oldPath, newPath, this._key, (error) => {
        if (callback) {
          callback(error);
        }
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Return a promise
   */
  sftpMkdir(path, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpMkdir(path, this._key, (error) => {
        if (callback) {
          callback(error);
        }
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Return a promise
   */
  sftpRm(path, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpRm(path, this._key, (error) => {
        if (callback) {
          callback(error);
        }
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Return a promise
   */
  sftpRmdir(path, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpRmdir(path, this._key, (error) => {
        if (callback) {
          callback(error);
        }
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  /**
   * Return a promise
   */
  sftpUpload(filePath, path, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpUpload(filePath, path, this._key, (error) => {
        if (callback) {
          callback(error);
        }
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  sftpCancelUpload() {
    RNSSHClient.sftpCancelUpload(this._key);
  }

  /**
   * Return a promise
   */
  sftpDownload(path, toPath, callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.sftpDownload(path, toPath, this._key, (error, response) => {
        if (callback) {
          callback(error, response);
        }
        if (error) {
          return reject(error);
        }
        resolve(response);
      });
    });
  }

  sftpCancelDownload() {
    RNSSHClient.sftpCancelDownload(this._key);
  }

  disconnectSFTP() {
    this._unregisterNativeListener(NATIVE_EVENT_DOWNLOAD_PROGRESS);
    this._unregisterNativeListener(NATIVE_EVENT_UPLOAD_PROGRESS);
    RNSSHClient.disconnectSFTP(this._key);
  }

  disconnect() {
    this._unregisterNativeListener("*");
    RNSSHClient.disconnect(this._key);
  }
}
