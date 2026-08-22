package dto

import "github.com/gin-gonic/gin/binding"

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
	SessionDuration                            string `json:"sessionDuration" binding:"required,integer_string"`
	HomePageURL                                string `json:"homePageUrl" binding:"required"`
	EmailsVerified                             string `json:"emailsVerified" binding:"required,boolean_string"`
	DisableAnimations                          string `json:"disableAnimations" binding:"required,boolean_string"`
	AllowOwnAccountEdit                        string `json:"allowOwnAccountEdit" binding:"required,boolean_string"`
	AllowUserSignups                           string `json:"allowUserSignups" binding:"required,oneof=disabled withToken open"`
	SignupDefaultUserGroupIDs                  string `json:"signupDefaultUserGroupIDs" binding:"omitempty,json_string_array"`
	SignupDefaultCustomClaims                  string `json:"signupDefaultCustomClaims" binding:"omitempty,json_custom_claims"`
	AccentColor                                string `json:"accentColor"`
<<<<<<< HEAD
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
=======
	RequireUserEmail                           string `json:"requireUserEmail" binding:"required,boolean_string"`
>>>>>>> main
	SmtpHost                                   string `json:"smtpHost"`
	SmtpPort                                   string `json:"smtpPort"`
	SmtpFrom                                   string `json:"smtpFrom" binding:"omitempty,email"`
	SmtpUser                                   string `json:"smtpUser"`
	SmtpPassword                               string `json:"smtpPassword"`
	SmtpTls                                    string `json:"smtpTls" binding:"required,oneof=none starttls tls"`
	SmtpSkipCertVerify                         string `json:"smtpSkipCertVerify" binding:"required,boolean_string"`
	LdapEnabled                                string `json:"ldapEnabled" binding:"required,boolean_string"`
	LdapUrl                                    string `json:"ldapUrl"`
	LdapBindDn                                 string `json:"ldapBindDn"`
	LdapBindPassword                           string `json:"ldapBindPassword"`
	LdapBase                                   string `json:"ldapBase"`
	LdapUserSearchFilter                       string `json:"ldapUserSearchFilter"`
	LdapUserGroupSearchFilter                  string `json:"ldapUserGroupSearchFilter"`
	LdapSkipCertVerify                         string `json:"ldapSkipCertVerify" binding:"required,boolean_string"`
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
	LdapSoftDeleteUsers                        string `json:"ldapSoftDeleteUsers" binding:"required,boolean_string"`
	WebauthnUserVerification                   string `json:"webauthnUserVerification" binding:"required,oneof=required preferred"`
	WebauthnAllowSyncedPasskeys                string `json:"webauthnAllowSyncedPasskeys" binding:"required,boolean_string"`
	WebauthnAuthenticatorAttachment            string `json:"webauthnAuthenticatorAttachment" binding:"required,oneof=any platform cross-platform"`
	EmailOneTimeAccessAsAdminEnabled           string `json:"emailOneTimeAccessAsAdminEnabled" binding:"required,boolean_string"`
	EmailOneTimeAccessAsUnauthenticatedEnabled string `json:"emailOneTimeAccessAsUnauthenticatedEnabled" binding:"required,boolean_string"`
	EmailLoginNotificationEnabled              string `json:"emailLoginNotificationEnabled" binding:"required,boolean_string"`
	EmailApiKeyExpirationEnabled               string `json:"emailApiKeyExpirationEnabled" binding:"required,boolean_string"`
	EmailVerificationEnabled                   string `json:"emailVerificationEnabled" binding:"required,boolean_string"`
	CIMDURLAllowlist                           string `json:"cimdUrlAllowlist" binding:"omitempty,cimd_url_allowlist"`
}

func (a AppConfigUpdateDto) Validate() error {
	return binding.Validator.ValidateStruct(a)
}
