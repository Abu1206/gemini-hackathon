"use client";

import Image from "next/image";
import { Venue } from "@/lib/agent/types";

interface Props {
  venue: Venue;
}

export default function VenueCard({ venue }: Props) {
  return (
    <div
      className="glass premium-card fade-in"
      style={{
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {venue.imageUrl && (
        <div style={{ position: "relative", height: "200px", width: "100%" }}>
          <Image
            src={venue.imageUrl}
            alt={venue.name}
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "var(--accent-gold)",
              color: "var(--bg-primary)",
              padding: "4px 12px",
              borderRadius: "50px",
              fontWeight: "800",
              fontSize: "0.9rem",
            }}
          >
            {venue.vibeScore}% Vibe
          </div>
        </div>
      )}

      <div
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.5rem", marginBottom: "4px" }}>
            {venue.name}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {venue.location.address}
          </p>
        </div>

        <p style={{ fontSize: "0.95rem", lineHeight: "1.5", opacity: 0.9 }}>
          {venue.vibeSummary}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {venue.pros.map((pro, i) => (
            <span
              key={i}
              style={{
                background: "rgba(201,160,80,0.1)",
                color: "var(--accent-gold)",
                padding: "4px 12px",
                borderRadius: "50px",
                fontSize: "0.75rem",
                fontWeight: "600",
              }}
            >
              ✓ {pro}
            </span>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--glass-border)",
            paddingTop: "16px",
          }}
        >
          <h4
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "12px",
              letterSpacing: "0.05em",
            }}
          >
            Social Intelligence
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {venue.socialHighlights.map((highlight, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  padding: "10px",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                }}
              >
                <span
                  style={{
                    color: "var(--accent-gold)",
                    fontWeight: "700",
                    marginRight: "8px",
                  }}
                >
                  {highlight.platform.toUpperCase()}
                </span>
                &ldquo;{highlight.content}&rdquo;
              </div>
            ))}
          </div>
        </div>

        {/* Website & Social Links */}
        {(venue.website || venue.socialLinks) && (
          <div
            style={{
              borderTop: "1px solid var(--glass-border)",
              paddingTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--accent-gold)",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                🌐 Visit Website
              </a>
            )}
            {venue.socialLinks && (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {venue.socialLinks.instagram && (
                  <a
                    href={venue.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(201,160,80,0.1)",
                      color: "var(--accent-gold)",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      textDecoration: "none",
                      fontWeight: "600",
                      border: "1px solid rgba(201,160,80,0.3)",
                    }}
                  >
                    📷 Instagram
                  </a>
                )}
                {venue.socialLinks.tiktok && (
                  <a
                    href={venue.socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(201,160,80,0.1)",
                      color: "var(--accent-gold)",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      textDecoration: "none",
                      fontWeight: "600",
                      border: "1px solid rgba(201,160,80,0.3)",
                    }}
                  >
                    🎵 TikTok
                  </a>
                )}
                {venue.socialLinks.twitter && (
                  <a
                    href={venue.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "rgba(201,160,80,0.1)",
                      color: "var(--accent-gold)",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      textDecoration: "none",
                      fontWeight: "600",
                      border: "1px solid rgba(201,160,80,0.3)",
                    }}
                  >
                    𝕏 Twitter
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Reviews */}
        {venue.userReviews && venue.userReviews.length > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--glass-border)",
              paddingTop: "16px",
            }}
          >
            <h4
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                marginBottom: "12px",
                letterSpacing: "0.05em",
              }}
            >
              What People Are Saying
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "300px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {venue.userReviews.map((review, i) => (
                <div
                  key={i}
                  className="glass"
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    fontSize: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--accent-gold)" }}>
                        {review.author}
                      </strong>
                      {review.platform && (
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.7rem",
                            marginLeft: "8px",
                          }}
                        >
                          via {review.platform}
                        </span>
                      )}
                    </div>
                    <div style={{ color: "var(--accent-gold)" }}>
                      {"⭐".repeat(review.rating)}
                    </div>
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: "1.5",
                      margin: "0",
                    }}
                  >
                    {review.comment}
                  </p>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-secondary)",
                      opacity: 0.6,
                      marginTop: "6px",
                      margin: "0",
                    }}
                  >
                    {new Date(review.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wallet Whiz Section */}
        {(venue.priceBreakdown || venue.costFriendlinessReview) && (
          <div
            style={{
              background: "rgba(201,160,80,0.05)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(201,160,80,0.2)",
            }}
          >
            <h4
              style={{
                fontSize: "0.85rem",
                color: "var(--accent-gold)",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              💸 Wallet Whiz
            </h4>
            {venue.priceBreakdown && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  lineHeight: "1.4",
                }}
              >
                <strong>Est. Costs:</strong> {venue.priceBreakdown}
              </p>
            )}
            {venue.costFriendlinessReview && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                  margin: "0",
                }}
              >
                &ldquo;{venue.costFriendlinessReview}&rdquo;
              </p>
            )}
          </div>
        )}

        <div
          style={{
            background: "var(--bg-secondary)",
            padding: "12px",
            borderRadius: "12px",
            border: "1px dashed var(--accent-gold)",
          }}
        >
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--accent-gold)",
              textAlign: "center",
            }}
          >
            <strong>Worth-it Factor:</strong> {venue.worthItFactor}
          </p>
        </div>
      </div>
    </div>
  );
}
