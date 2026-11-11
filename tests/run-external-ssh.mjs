/** Explicit isolated SSH qualification using the Docker test resource from DEVOPS. */
import {execFile,spawnSync} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const exec=promisify(execFile),root=await mkdtemp(join(tmpdir(),'cab-ssh-qualification-'));
const name='cab-external-ssh-'+Date.now();let started=false;
try {
 await exec('docker',['image','inspect','debian:stable-slim'],{maxBuffer:65536});
 await exec('docker',['run','--rm','-d','--name',name,'-p','127.0.0.1::22','debian:stable-slim','sleep','900']);started=true;
 await exec('docker',['exec',name,'apt-get','update','-qq'],{timeout:120000,maxBuffer:65536});
 await exec('docker',['exec','-e','DEBIAN_FRONTEND=noninteractive',name,'apt-get','install','-y','-qq','openssh-server','python3'],{timeout:120000,maxBuffer:65536});
 const setup=spawnSync('docker',['exec','-i',name,'chpasswd'],{input:'root:fixture-private-password\n',encoding:'utf8'});
 if(setup.status!==0)throw Error('synthetic SSH account preparation failed');
 await exec('docker',['exec',name,'mkdir','-p','/run/sshd']);
 await exec('docker',['exec',name,'/usr/sbin/sshd','-o','PermitRootLogin=yes','-o','PasswordAuthentication=yes','-o','PrintMotd=no','-o','PrintLastLog=no']);
 const published=(await exec('docker',['port',name,'22/tcp'])).stdout.trim();const port=published.split(':').at(-1);
 if(!/^\d+$/.test(port))throw Error('invalid fixture port');
 const publicKey=(await exec('docker',['exec',name,'cat','/etc/ssh/ssh_host_ed25519_key.pub'])).stdout.trim().split(/\s+/).slice(0,2).join(' ');
 const known=join(root,'known_hosts');await writeFile(known,'[127.0.0.1]:'+port+' '+publicKey+'\n',{mode:0o600});
 const env={...process.env,CAB_TEST_EXTERNAL:'1',CAB_TEST_EXTERNAL_SSH_PORT:port,CAB_TEST_EXTERNAL_KNOWN_HOSTS:known,
  CAB_TEST_BROKER_UID:process.env.CAB_TEST_BROKER_UID||'1002',CAB_TEST_AUTONOMY_ONLY:'1',CAB_TEST_OPENCODE:process.env.CAB_TEST_OPENCODE||'/home/devops/.opencode/bin/opencode'};
 const result=await exec(process.execPath,['--test','tests/native-opencode-codemode.test.mjs'],{env,timeout:120000,maxBuffer:4*1024*1024});
 process.stdout.write(result.stdout);process.stderr.write(result.stderr);
 process.stdout.write(JSON.stringify({qualification:'real SSH over native MCP, distinct UIDs',status:'passed',bank:'isolated Docker container',productionBankUntouched:true})+'\n');
} catch(error) {
 process.stderr.write(error.stdout||'');process.stderr.write(error.stderr||'');process.stderr.write('SSH qualification failed: '+(error.code||error.message)+'\n');process.exitCode=1;
} finally {
 if(started)await exec('docker',['rm','-f',name]).catch(()=>{process.exitCode=1;});
 await rm(root,{recursive:true,force:true});
}
