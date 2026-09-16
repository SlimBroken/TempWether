import {mkdir,rm,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ['index.html','src','public','THIRD_PARTY_NOTICES.md','.nojekyll'])await cp(file,'dist/'+file,{recursive:true});
console.log('Built dependency-free static site in dist/');
