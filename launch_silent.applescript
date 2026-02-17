
try
    set wrapperPath to "/Users/john/Projects/Fortify-Repo/start_silent.sh"
    
    -- Execute the wrapper script
    do shell script wrapperPath
    
    -- Wait a moment for server to initialize
    delay 5
    
    -- Open browser
    open location "http://localhost:3000"
    
on error errMsg
    display dialog "Error launching Fortify: " & errMsg buttons {"OK"} default button "OK"
end try
