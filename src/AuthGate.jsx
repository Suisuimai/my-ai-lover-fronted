import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(signUp = false) {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setError("Enter your email."); return; }
    if (signUp && !window.confirm(`请确认注册邮箱：\n\n${normalizedEmail}\n\n邮箱写错会生成另一套独立账号。确认无误吗？`)) return;
    const result = signUp
      ? await supabase.auth.signUp({ email: normalizedEmail, password })
      : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (result.error) setError(result.error.message);
    else if (signUp && !result.data.session) setError("Check your email to confirm the account, then sign in.");
  }

  if (session) return children;
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#F7F6F3",padding:24}}><section style={{width:"100%",maxWidth:360,background:"#fff",padding:28,borderRadius:20}}><h1>My AI Lover</h1><p>Sign in to your private companion.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" style={{width:"100%",boxSizing:"border-box",padding:12,marginTop:12}}/><input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} placeholder="Password" type="password" autoComplete="current-password" style={{width:"100%",boxSizing:"border-box",padding:12,marginTop:10}}/>{error&&<p style={{color:"#c33"}}>{error}</p>}<button onClick={()=>submit(false)} style={{width:"100%",marginTop:14,padding:12,border:0,borderRadius:12,background:"#1C1C1E",color:"white"}}>Sign in</button><button onClick={()=>submit(true)} style={{width:"100%",marginTop:8,padding:10,border:0,background:"transparent"}}>Create account</button><p style={{fontSize:11,color:"#8E8E93",lineHeight:1.5,margin:"8px 2px 0"}}>Registration remains available, but the email must be confirmed before a separate account is created.</p></section></main>;
}
