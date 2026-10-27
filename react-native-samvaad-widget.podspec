require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-samvaad-widget"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/sachdesk/samvaad-react-native"
  s.license      = { :type => "MIT", :file => "LICENSE" }
  s.author       = "Sachdesk"
  s.source       = { :git => "https://github.com/sachdesk/samvaad-react-native.git", :tag => s.version.to_s }

  s.platforms    = { :ios => "15.0" }
  s.swift_version = "5.9"

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }

  s.dependency "React-Core"
  s.dependency "Samvaad", "~> 0.1.0"
end
