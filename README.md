# react-native-ssh-sftp

SSH and SFTP client library for React Native.

## Installation

```
npm install react-native-ssh-sftp --save
```

### iOS (only)

(procedure below is untested on recent version)

NMSSH is required for iOS.

1. Initialize Pod:
	```
	cd ios
	pod init
	```
2. Open Podfile and add:
	```
	target '[your project's name]' do
		pod 'NMSSH', '2.2.8'
	end
	```
3. Install Pod:
	```
	pod install
	```

### Manual Link

#### iOS

(not that this should not be required anymore)

1. In XCode, in the project navigator, right click `Libraries` ➜ `Add Files to [your project's name]`
2. Go to `node_modules` ➜ `react-native-ssh-sftp` and add `RNSSHClient.xcodeproj`
3. In XCode, in the project navigator, select your project. Add `libRNSSHClient.a` to your project's `Build Phases` ➜ `Link Binary With Libraries`

#### Android

Don't manual link.

## Demo

![example](https://raw.githubusercontent.com/KeeeX/react-native-ssh-sftp/master/example.gif)

- This library is also used in iOS app PiHelper. 

<a href="https://itunes.apple.com/app/pihelper/id1369930932"><img src="https://is4-ssl.mzstatic.com/image/thumb/Purple128/v4/ba/5b/59/ba5b592a-5446-1c21-6703-3eb3fb25007e/AppIcon-1x_U007emarketing-85-220-9.png/246x0w.jpg" align="left" height="75" width="75" ></a>
<br />
<br />
<br />

## Run demo

### iOS
```
cd example
cd ios
pod install
cd ..
npm install
react-native run-ios
```

### Android
```
cd example
npm install
react-native run-android
```

## Usage

All functions that run asynchronously where we have to wait for a result
returns Promises that can reject if an error occured.

### Create a client using password authentication
```javascript
import SSHClient from 'react-native-ssh-sftp';

SSHClient.connectWithPassword(
  "10.0.0.10",
  22,
  "user",
  "password"
).then(client => {/*...*/});
```

### Create a client using public key authentication
```javascript
import SSHClient from 'react-native-ssh-sftp';

SSHClient.connectWithKey(
  "10.0.0.10",
  22,
  "user",
  privateKey="-----BEGIN RSA...",
  passphrase
).then(client => {/*...*/});
```

- Public key authentication also supports:
```
{privateKey: '-----BEGIN RSA......'}
{privateKey: '-----BEGIN RSA......', publicKey: 'ssh-rsa AAAAB3NzaC1yc2EA......'}
{privateKey: '-----BEGIN RSA......', publicKey: 'ssh-rsa AAAAB3NzaC1yc2EA......', passphrase: 'Password'}
```

### Close client
```javascript
client.disconnect();
```

### Execute SSH command
```javascript
var command = 'ls -l';
client.execute(command)
  .then(output => console.warn(output));
```

### Shell

#### Start shell: 
- Supported ptyType: vanilla, vt100, vt102, vt220, ansi, xterm
```javascript
var ptyType = 'vanilla';
client.startShell(ptyType)
  .then(() => {/*...*/});
```

#### Read from shell:
```javascript
client.on('Shell', (event) => {
  if (event)
    console.warn(event);
});
```

#### Write to shell: 
```javascript
var str = 'ls -l\n';
client.writeToShell(str)
  .then(() => {/*...*/});
```

#### Close shell: 
```javascript
client.closeShell();
```

### SFTP

#### Connect SFTP
```javascript
client.connectSFTP()
  .then(() => {/*...*/});
```

#### List directory: 
```javascript
var path = '.';
client.sftpLs(path)
  .then(response => console.warn(response));
```

#### Create directory: 
```javascript
client.sftpMkdir('dirName')
  .then(() => {/*...*/});
```

#### Rename file or directory: 
```javascript
client.sftpRename('oldName', 'newName')
  .then(() => {/*...*/});
```

#### Remove directory: 
```javascript
client.sftpRmdir('dirName')
  .then(() => {/*...*/});
```

#### Remove file: 
```javascript
client.sftpRm('fileName')
  .then(() => {/*...*/});
```

#### Download file: 
```javascript
client.sftpDownload('[path-to-remote-file]', '[path-to-local-directory]')
  .then(downloadedFilePath => {
    console.warn(downloadedFilePath);
  });

// Download progress (setup before call)
client.on('DownloadProgress', (event) => {
  console.warn(event);
});

// Cancel download:
client.sftpCancelDownload();
```

#### Upload file: 
```javascript
client.sftpUpload('[path-to-local-file]', '[path-to-remote-directory]')
  .then(() => {/*...*/});

// Upload progress (setup before call)
client.on('UploadProgress', (event) => {
  console.warn(event);
});

// Cancel upload:
client.sftpCancelUpload();
```

#### Close SFTP: 
```javascript
client.disconnectSFTP();
```

## Credits

* iOS SSH library: [NMSSH](https://github.com/NMSSH/NMSSH)
* Android SSH library: [JSch](http://www.jcraft.com/jsch/)
