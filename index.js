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
   * @param passphrase
   * Passphrase to unlock the private key. Can be omitted.
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
    this._key = SSHClient._getRandomClientKey();
    this._listeners = {};
    this._counters = {
      download: 0,
      upload: 0,
    };
    this._activeStream = {
      sftp: false,
      shell: false,
    };
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
  static _getRandomClientKey() {
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
    const listener = this._listeners[eventName];
    if (listener) {
      listener.remove();
      delete this._listeners[eventName];
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
   * Execute a command on the remote server
   *
   * @param command
   * Command to execute, as a string
   *
   * @return
   * A promise
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
   * Open a shell on the remote.
   *
   * You must handle the "Shell" events to get the shell outputs.
   *
   * @param {string} ptyType
   * vanilla, vt100, vt102, vt220, ansi, xterm
   *
   * @return
   * A Promise that resolve with the initial output
   */
  startShell(ptyType, callback) {
    if (this._activeStream.shell) {
      return Promise.resolve("");
    }
    return new Promise((resolve, reject) => {
      this._registerNativeListener(NATIVE_EVENT_SHELL);
      RNSSHClient.startShell(this._key, ptyType, (error, response) => {
        if (callback) {
          callback(error, response);
        }
        if (error) {
          return reject(error);
        }
        this._activeStream.shell = true;
        resolve(response);
      });
    });
  }

  /**
   * Make sure that a shell connection is open
   */
  _checkShell(callback) {
    if (this._activeStream.shell) {
      return Promise.resolve("");
    }
    return this.startShell("vanilla")
      .then(
        res => res
          ? res + "\n"
          : ""
      ).catch(error => {
        if (callback) {
          callback(error);
        }
        throw error;
      });
  }

  /**
   * Send some input to the server
   *
   * @return
   * A promise with the immediate reply
   */
  writeToShell(command, callback) {
    return this._checkShell(callback)
      .then(() => new Promise((resolve, reject) => {
        RNSSHClient.writeToShell(command, this._key, (error, response) => {
          if (callback) {
            callback(error, response);
          }
          if (error) {
            return reject(error);
          }
          resolve(response);
        });
      }));
  }

  /**
   * Close the open shell connection
   */
  closeShell() {
    this._unregisterNativeListener(NATIVE_EVENT_SHELL);
    // TODO this should use a callback too
    RNSSHClient.closeShell(this._key);
    this._activeStream.shell = false;
  }

  /**
   * Open an SFTP connection on the server
   *
   * It is not mandatory to call this method before calling any SFTP method.
   *
   * @return
   * A promise
   */
  connectSFTP(callback) {
    if (this._activeStream.sftp) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      RNSSHClient.connectSFTP(this._key, (error) => {
        this._activeStream.sftp = true;
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
   * Make sure an SFTP connection is open
   *
   * @return
   * A promise
   */
  _checkSFTP(callback) {
    if (this._activeStream.sftp) {
      return Promise.resolve();
    }
    return this.connectSFTP()
      .catch(error => {
        if (callback) {
          callback(error);
        }
        throw error;
      });
  }

  /**
   * List a directory content on the server
   *
   * @param path
   * The path to list
   *
   * @return
   * A promise with the file listing as an object.
   */
  sftpLs(path, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        RNSSHClient.sftpLs(path, this._key, (error, response) => {
          if (callback) {
            callback(error, response);
          }
          if (error) {
            return reject(error);
          }
          resolve(response);
        });
      }));
  }

  /**
   * Rename a file on the server
   *
   * @return
   * A promise
   */
  sftpRename(oldPath, newPath, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        RNSSHClient.sftpRename(oldPath, newPath, this._key, (error) => {
          if (callback) {
            callback(error);
          }
          if (error) {
            return reject(error);
          }
          resolve();
        });
      }));
  }

  /**
   * Create a directory on the server
   *
   * @return
   * A promise
   */
  sftpMkdir(path, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        RNSSHClient.sftpMkdir(path, this._key, (error) => {
          if (callback) {
            callback(error);
          }
          if (error) {
            return reject(error);
          }
          resolve();
        });
      }));
  }

  /**
   * Unlink a file on the server
   *
   * @return
   * A promise
   */
  sftpRm(path, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        RNSSHClient.sftpRm(path, this._key, (error) => {
          if (callback) {
            callback(error);
          }
          if (error) {
            return reject(error);
          }
          resolve();
        });
      }));
  }

  /**
   * Remove a directory from the server
   *
   * @return
   * A promise
   */
  sftpRmdir(path, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        RNSSHClient.sftpRmdir(path, this._key, (error) => {
          if (callback) {
            callback(error);
          }
          if (error) {
            return reject(error);
          }
          resolve();
        });
      }));
  }

  /**
   * Upload a file
   *
   * @param localFilePath
   * Path to the source file on the filesystem
   *
   * @param remoteFilePath
   * Path for the file on the remote server
   *
   * @return
   * A promise
   */
  sftpUpload(localFilePath, remoteFilePath, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        ++this._counters.upload;
        RNSSHClient.sftpUpload(
          localFilePath,
          remoteFilePath,
          this._key,
          error => {
            --this._counters.upload;
            if (callback) {
              callback(error);
            }
            if (error) {
              return reject(error);
            }
            resolve();
          }
        );
      }));
  }

  /**
   * Cancel a pending upload
   */
  sftpCancelUpload() {
    if (this._counters.upload > 0) {
      RNSSHClient.sftpCancelUpload(this._key);
    }
  }

  /**
   * Download a file from the server
   *
   * @param remoteFilePath
   * Path to the file on the remote server
   *
   * @param localFilePath
   * Path to the file on the local filesystem
   *
   * @return
   * A promise
   */
  sftpDownload(remoteFilePath, localFilePath, callback) {
    return this._checkSFTP(callback)
      .then(() => new Promise((resolve, reject) => {
        ++this._counters.download;
        RNSSHClient.sftpDownload(
          remoteFilePath,
          localFilePath,
          this._key,
          (error, response) => {
            --this._counters.download;
            if (callback) {
              callback(error, response);
            }
            if (error) {
              return reject(error);
            }
            resolve(response);
          }
        );
      }));
  }

  /**
   * Cancel a pending download
   */
  sftpCancelDownload() {
    if (this._counters.download > 0) {
      RNSSHClient.sftpCancelDownload(this._key);
    }
  }

  /**
   * Close an open SFTP connection on the remote server
   */
  disconnectSFTP() {
    this._unregisterNativeListener(NATIVE_EVENT_DOWNLOAD_PROGRESS);
    this._unregisterNativeListener(NATIVE_EVENT_UPLOAD_PROGRESS);
    // TODO this should use a callback too
    RNSSHClient.disconnectSFTP(this._key);
    this._activeStream.sftp = false;
  }

  /**
   * Close an open SSH connection on the remote server
   */
  disconnect() {
    if (this._activeStream.shell) {
      this.closeShell();
    }
    if (this._activeStream.sftp) {
      this.disconnectSFTP();
    }
    // TODO this should use a callback too
    RNSSHClient.disconnect(this._key);
  }
}
