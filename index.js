import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter
} from 'react-native';

const { RNSSHClient } = NativeModules;

const RNSSHClientEmitter = new NativeEventEmitter(RNSSHClient);

class SSHClient {
  // passwordOrKey: password or {privateKey: value, [publicKey: value, passphrase: value]}
	constructor(host, port, username, passwordOrKey, callback) {
    this._key = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    this.handlers = {};
    this.host = host;
    this.port = port;
    this.username = username;
    this.passwordOrKey = passwordOrKey;
    this._connect(callback);
	}

  _handleEvent (event) {
    if (this.handlers.hasOwnProperty(event.name) && this._key === event.key) {
      this.handlers[event.name](event.value);
    }
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  _connect(callback) {
    if (Platform.OS === "android") {
      if (typeof this.passwordOrKey === "string")
        RNSSHClient.connectToHostByPassword(this.host, this.port, this.username, this.passwordOrKey, this._key,
          (error) => {
            callback && callback(error);
          });
      else
        RNSSHClient.connectToHostByKey(this.host, this.port, this.username, this.passwordOrKey, this._key,
          (error) => {
            callback && callback(error);
          });
    } else {
      RNSSHClient.connectToHost(this.host, this.port, this.username, this.passwordOrKey, this._key,
        (error) => {
          callback && callback(error);
        });
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

  // ptyType: vanilla, vt100, vt102, vt220, ansi, xterm
  /**
   * Return a promise. Resolve when shell is open.
   * Still depend on the "Shell" event.
   */
	startShell(ptyType, callback) {
    if (Platform.OS === 'ios') {
      this.shellListener = RNSSHClientEmitter.addListener('Shell', this._handleEvent.bind(this));
    } else {
      this.shellListener = DeviceEventEmitter.addListener('Shell', this._handleEvent.bind(this));
    }
    return new Promise((resolve, reject) => {
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
    })
  }

  closeShell() {
    if (this.shellListener) {
      this.shellListener.remove();
      this.shellListener = null;
    }
    RNSSHClient.closeShell(this._key);
  }

  /**
   * Return a promise
   */
  connectSFTP(callback) {
    return new Promise((resolve, reject) => {
      RNSSHClient.connectSFTP(this._key, (error) => {
        if (Platform.OS === 'ios') {
          this.downloadProgressListener = RNSSHClientEmitter.addListener('DownloadProgress', this._handleEvent.bind(this));
          this.uploadProgressListener = RNSSHClientEmitter.addListener('UploadProgress', this._handleEvent.bind(this));
        } else {
          this.downloadProgressListener = DeviceEventEmitter.addListener('DownloadProgress', this._handleEvent.bind(this));
          this.uploadProgressListener = DeviceEventEmitter.addListener('UploadProgress', this._handleEvent.bind(this));
        }
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
    })
  }

  sftpCancelDownload() {
    RNSSHClient.sftpCancelDownload(this._key);
  }

  disconnectSFTP() {
    if (this.downloadProgressListener) {
      this.downloadProgressListener.remove();
      this.downloadProgressListener = null;
    }
    if (this.uploadProgressListener) {
      this.uploadProgressListener.remove();
      this.uploadProgressListener = null;
    }
    RNSSHClient.disconnectSFTP(this._key);
  }

  disconnect() {
    if (this.shellListener)
      this.shellListener.remove();
    if (this.downloadProgressListener)
      this.downloadProgressListener.remove();
    if (this.uploadProgressListener)
      this.uploadProgressListener.remove();
    RNSSHClient.disconnect(this._key);
  }
}

/** Connect using a key. 
 * 
 * Return a promise that resolve when the connection is established.
 * privateKey is a string.
 */
SSHClient.connectWithKey = (
  host,
  port,
  username,
  privateKey,
  passphrase,
  callback
) => new Promise((resolve, reject) => {
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

/** Connect using a password */
SSHClient.connectWithPassword = (
  host,
  port,
  username,
  password,
  callback
) => new Promise((resolve, reject) => {
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
})

export default SSHClient;
