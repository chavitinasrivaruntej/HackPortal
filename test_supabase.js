const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZGpicXpneHlyaGZ2dXV5b3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjM5OTMsImV4cCI6MjA4OTU5OTk5M30.EHJA0GST5ZzbkzxZw0_rqEejjL--O40TU0LedR0fON0";

Promise.all([
    fetch("https://ogdjbqzgxyrhfvuuyorg.supabase.co/rest/v1/admins?select=*", {
        headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    }).then(r => r.json()),
    fetch("https://ogdjbqzgxyrhfvuuyorg.supabase.co/rest/v1/teams?select=*", {
        headers: { "apikey": key, "Authorization": `Bearer ${key}` }
    }).then(r => r.json())
]).then(([admins, teams]) => {
    console.log("Admins DB:", admins);
    console.log("Teams DB:", teams);
});
