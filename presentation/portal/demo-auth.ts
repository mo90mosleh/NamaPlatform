import {createClient} from '@supabase/supabase-js';

const loginEmail='admin@nama-demo.example';
const client=createClient('https://fntidoyddwhwncplocno.supabase.co','sb_publishable_MBreIn70GkKhVux0ntnkhA_nxRv6eLI',{
 auth:{storageKey:'nama-demo-admin-session-v2',detectSessionInUrl:false,autoRefreshToken:true},
});
let expiresAt=0;
let trustedToken='';
const isDemoAdmin=(user:{email?:string;app_metadata:Record<string,unknown>}|null)=>
 user?.email===loginEmail&&user.app_metadata.nama_demo_admin===true;

export function demoAdminActive(){return expiresAt>Date.now();}

export async function refreshDemoAdmin(){
 try{
  const {data:{session}}=await client.auth.getSession();
  if(session&&session.access_token===trustedToken&&demoAdminActive())return;
  if(session){
   const {data:{user}}=await client.auth.getUser(session.access_token);
   if(isDemoAdmin(user)){
    trustedToken=session.access_token;
    expiresAt=(session.expires_at??0)*1000;
    return;
   }
  }
 }catch{/* The public demo remains available when sign-in is unavailable. */}
 expiresAt=0;
 trustedToken='';
}

export async function signInDemoAdmin(username:string,password:string){
 if(username.trim().toLowerCase()!=='admin')throw Error('نام کاربری یا رمز عبور درست نیست.');
 const {data,error}=await client.auth.signInWithPassword({email:loginEmail,password});
 if(error||!data.session||!isDemoAdmin(data.user))throw Error('ورود انجام نشد. نام کاربری و رمز عبور را بررسی کنید.');
 trustedToken=data.session.access_token;
 expiresAt=(data.session.expires_at??0)*1000;
}

export async function signOutDemoAdmin(){
 expiresAt=0;
 trustedToken='';
 const {error}=await client.auth.signOut({scope:'local'});
 if(error)throw Error('پایان نشست انجام نشد. دوباره تلاش کنید.');
}
