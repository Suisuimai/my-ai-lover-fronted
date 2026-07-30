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

  async function submit(signUp) {
    setError("");
    const result = signUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setError(result.error.message);
    else if (signUp && !result.data.session) setError("Check your email to confirm the account, then sign in.");
  }

  if (session) return children;
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#F7F6F3",padding:24}}><section style={{width:"100%",maxWidth:360,background:"#fff",padding:28,borderRadius:20}}><h1>My AI Lover</h1><p>Sign in to your private companion.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={{width:"100%",boxSizing:"border-box",padding:12,marginTop:12}}/><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (at least 6 characters)" type="password" style={{width:"100%",boxSizing:"border-box",padding:12,marginTop:10}}/>{error&&<p style={{color:"#c33"}}>{error}</p>}<button onClick={()=>submit(false)} style={{width:"100%",marginTop:14,padding:12,border:0,borderRadius:12,background:"#1C1C1E",color:"white"}}>Sign in</button><button onClick={()=>submit(true)} style={{width:"100%",marginTop:8,padding:10,border:0,background:"transparent"}}>Create account</button></section></main>;
}
