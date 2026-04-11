package dto

type PublicAppConfigVariableDto struct {
	Key   string `json:"key"`
	Type  string `json:"type"`
	Value string `json:"value"`
}

type AppConfigVariableDto struct {
	PublicAppConfigVariableDto
	IsPublic bool `json:"isPublic"`
}

type AppConfigUpdateDto struct {
	AppName                                    string `json:"appName" binding:"required,min=1,max=30" unorm:"nfc"`
	SessionDuration                            string `json:"sessionDuration" binding:"required"`
	HomePageURL                                string `json:"homePageUrl" binding:"required"`
	EmailsVerified                             string `json:"emailsVerified" binding:"required"`
	DisableAnimations                          string `json:"disableAnimations" binding:"required"`
	AllowOwnAccountEdit                        string `json:"allowOwnAccountEdit" binding:"required"`
	AllowUserSignups                           string `json:"allowUserSignups" binding:"required,oneof=disabled withToken open"`
	SignupDefaultUserGroupIDs                  string `json:"signupDefaultUserGroupIDs" binding:"omitempty,json"`
	SignupDefaultCustomClaims                  string `json:"signupDefaultCustomClaims" binding:"omitempty,json"`
	AccentColor                                string `json:"accentColor"`
	DynamicBackgroundEnabled                   string `json:"dynamicBackgroundEnabled" binding:"required"`
	DynamicBackgroundTheme                     string `json:"dynamicBackgroundTheme" binding:"required,oneof=Ember Ocean Forest Sunset Lavender Cherry Gold Midnight Neon Monochrome"`
	DynamicBackgroundSeed                      string `json:"dynamicBackgroundSeed" binding:"required,numeric"`
	DynamicBackgroundDensity                   string `json:"dynamicBackgroundDensity" binding:"required,numeric"`
	DynamicBackgroundFlowSpeed                 string `json:"dynamicBackgroundFlowSpeed" binding:"required,numeric"`
	DynamicBackgroundNoiseScale                string `json:"dynamicBackgroundNoiseScale" binding:"required,numeric"`
	DynamicBackgroundTurbulence                string `json:"dynamicBackgroundTurbulence" binding:"required,numeric"`
	DynamicBackgroundTrailFade                 string `json:"dynamicBackgroundTrailFade" binding:"required,numeric"`
	DynamicBackgroundParticleSize              string `json:"dynamicBackgroundParticleSize" binding:"required,numeric"`
	RequireUserEmail                           string `json:"requireUserEmail" binding:"required"`
	SmtpHost                                   string `json:"smtpHost"`
	SmtpPort                                   string `json:"smtpPort"`
	SmtpFrom                                   string `json:"smtpFrom" binding:"omitempty,email"`
	SmtpUser                                   string `json:"smtpUser"`
	SmtpPassword                               string `json:"smtpPassword"`
	SmtpTls                                    string `json:"smtpTls" binding:"required,oneof=none starttls tls"`
	SmtpSkipCertVerify                         string `json:"smtpSkipCertVerify"`
	LdapEnabled                                string `json:"ldapEnabled" binding:"required"`
	LdapUrl                                    string `json:"ldapUrl"`
	LdapBindDn                                 string `json:"ldapBindDn"`
	LdapBindPassword                           string `json:"ldapBindPassword"`
	LdapBase                                   string `json:"ldapBase"`
	LdapUserSearchFilter                       string `json:"ldapUserSearchFilter"`
	LdapUserGroupSearchFilter                  string `json:"ldapUserGroupSearchFilter"`
	LdapSkipCertVerify                         string `json:"ldapSkipCertVerify"`
	LdapAttributeUserUniqueIdentifier          string `json:"ldapAttributeUserUniqueIdentifier"`
	LdapAttributeUserUsername                  string `json:"ldapAttributeUserUsername"`
	LdapAttributeUserEmail                     string `json:"ldapAttributeUserEmail"`
	LdapAttributeUserFirstName                 string `json:"ldapAttributeUserFirstName"`
	LdapAttributeUserLastName                  string `json:"ldapAttributeUserLastName"`
	LdapAttributeUserDisplayName               string `json:"ldapAttributeUserDisplayName"`
	LdapAttributeUserProfilePicture            string `json:"ldapAttributeUserProfilePicture"`
	LdapAttributeGroupMember                   string `json:"ldapAttributeGroupMember"`
	LdapAttributeGroupUniqueIdentifier         string `json:"ldapAttributeGroupUniqueIdentifier"`
	LdapAttributeGroupName                     string `json:"ldapAttributeGroupName"`
	LdapAdminGroupName                         string `json:"ldapAdminGroupName"`
	LdapSoftDeleteUsers                        string `json:"ldapSoftDeleteUsers"`
	EmailOneTimeAccessAsAdminEnabled           string `json:"emailOneTimeAccessAsAdminEnabled" binding:"required"`
	EmailOneTimeAccessAsUnauthenticatedEnabled string `json:"emailOneTimeAccessAsUnauthenticatedEnabled" binding:"required"`
	EmailLoginNotificationEnabled              string `json:"emailLoginNotificationEnabled" binding:"required"`
	EmailApiKeyExpirationEnabled               string `json:"emailApiKeyExpirationEnabled" binding:"required"`
	EmailVerificationEnabled                   string `json:"emailVerificationEnabled" binding:"required"`
}
